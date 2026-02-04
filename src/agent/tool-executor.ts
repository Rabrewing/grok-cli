import { GrokToolCall } from "../grok/client.js";
import { ToolResult } from "../types/index.js";
import { TextEditorTool, MorphEditorTool, BashTool, TodoTool, SearchTool } from "../tools/index.js";

export class ToolExecutor {
  private textEditor: TextEditorTool;
  private morphEditor: MorphEditorTool | null;
  private bash: BashTool;
  private todoTool: TodoTool;
  private search: SearchTool;

  getCurrentDirectory(): string {
    return this.bash.getCurrentDirectory();
  }

  async executeBashCommand(command: string) {
    return await this.bash.execute(command);
  }

  constructor(
    textEditor: TextEditorTool,
    morphEditor: MorphEditorTool | null,
    bash: BashTool,
    todoTool: TodoTool,
    search: SearchTool
  ) {
    this.textEditor = textEditor;
    this.morphEditor = morphEditor;
    this.bash = bash;
    this.todoTool = todoTool;
    this.search = search;
  }

  async executeTool(toolCall: GrokToolCall): Promise<ToolResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments);

      switch (toolCall.function.name) {
        case "view_file":
          const range: [number, number] | undefined =
            args.start_line && args.end_line
              ? [args.start_line, args.end_line]
              : undefined;
          return await this.textEditor.view(args.path, range);

        case "create_file":
          return await this.textEditor.create(args.path, args.content);

        case "str_replace_editor":
          return await this.textEditor.strReplace(
            args.path,
            args.old_str,
            args.new_str,
            args.replace_all
          );

        case "edit_file":
          if (!this.morphEditor) {
            return {
              success: false,
              error:
                "Morph Fast Apply not available. Please set MORPH_API_KEY environment variable to use this feature.",
            };
          }
          return await this.morphEditor.editFile(
            args.target_file,
            args.instructions,
            args.code_edit
          );

        case "bash":
          return await this.bash.execute(args.command);

        case "create_todo_list":
          return await this.todoTool.createTodoList(args.todos);

        case "update_todo_list":
          return await this.todoTool.updateTodoList(args.updates);

        case "search":
          return await this.search.search(args.query, {
            searchType: args.search_type,
            includePattern: args.include_pattern,
            excludePattern: args.exclude_pattern,
            caseSensitive: args.case_sensitive,
            wholeWord: args.whole_word,
            regex: args.regex,
            maxResults: args.max_results,
            fileTypes: args.file_types,
            includeHidden: args.include_hidden,
          });

        default:
          // Check if this is an MCP tool
          if (toolCall.function.name.startsWith("mcp__")) {
            // This would be handled by MCP handler
            return {
              success: false,
              error: `MCP tool execution not implemented in ToolExecutor`,
            };
          }

          return {
            success: false,
            error: `Unknown tool: ${toolCall.function.name}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
      };
    }
  }
}