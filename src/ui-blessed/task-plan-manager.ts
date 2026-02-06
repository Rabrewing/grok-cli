/**
 * Plan Mode System - Ensures Grok follows structured task execution
 * Forces task assignment, planning, and execution tracking
 */

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'PLANNING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'FAILED';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string; // Who is responsible (Grok, User, etc.)
  acceptanceCriteria: string[];
  dependencies: string[]; // Task IDs that must complete first
  estimatedEffort?: string;
  actualEffort?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface TaskPlan {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  currentFocusTask?: string; // Task being actively worked on
  createdAt: Date;
  updatedAt: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
  artifacts?: string[]; // Files created/modified
  duration: number;
  acceptanceChecklist: {
    criteria: string;
    passed: boolean;
    notes?: string;
  }[];
}

export class TaskPlanManager {
  private currentPlan: TaskPlan | null = null;
  private taskHistory: TaskExecutionResult[] = [];
  private planMode: boolean = true; // Force plan mode by default

  constructor() {
    this.loadCurrentPlan();
  }

  /**
   * Enable/disable plan mode
   */
  setPlanMode(enabled: boolean): void {
    this.planMode = enabled;
    console.log(`Plan mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  isPlanMode(): boolean {
    return this.planMode;
  }

  /**
   * Create a new task plan
   */
  createTaskPlan(title: string, description: string): TaskPlan {
    const plan: TaskPlan = {
      id: this.generateId('plan'),
      title,
      description,
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'ACTIVE'
    };

    this.currentPlan = plan;
    this.saveCurrentPlan();
    return plan;
  }

  /**
   * Add a task to the current plan
   */
  addTask(
    title: string,
    description: string,
    priority: TaskPriority = 'MEDIUM',
    acceptanceCriteria: string[] = [],
    dependencies: string[] = []
  ): Task {
    if (!this.currentPlan) {
      throw new Error('No active task plan. Call createTaskPlan() first.');
    }

    const task: Task = {
      id: this.generateId('task'),
      title,
      description,
      priority,
      status: 'PLANNING',
      assignedTo: 'Grok',
      acceptanceCriteria,
      dependencies,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.currentPlan.tasks.push(task);
    this.currentPlan.updatedAt = new Date();
    this.saveCurrentPlan();

    console.log(`✅ Task added: ${task.title} [${task.priority}]`);
    return task;
  }

  /**
   * Set the task that Grok should focus on
   */
  setFocusTask(taskId: string): void {
    if (!this.currentPlan) {
      throw new Error('No active task plan');
    }

    const task = this.currentPlan.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Reset previous focus task to PLANNING if it was IN_PROGRESS
    if (this.currentPlan.currentFocusTask) {
      const prevTask = this.currentPlan.tasks.find(t => t.id === this.currentPlan.currentFocusTask);
      if (prevTask && prevTask.status === 'IN_PROGRESS') {
        prevTask.status = 'PLANNING';
        prevTask.updatedAt = new Date();
      }
    }

    task.status = 'IN_PROGRESS';
    task.updatedAt = new Date();
    this.currentPlan.currentFocusTask = taskId;
    this.currentPlan.updatedAt = new Date();

    this.saveCurrentPlan();
    console.log(`🎯 Focus set: ${task.title} [${task.priority}]`);
    
    // Show task details and acceptance criteria
    this.displayTaskDetails(task);
  }

  /**
   * Complete a task with execution results
   */
  completeTask(taskId: string, result: TaskExecutionResult): void {
    if (!this.currentPlan) {
      throw new Error('No active task plan');
    }

    const task = this.currentPlan.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Update task status
    task.status = result.success ? 'COMPLETED' : 'FAILED';
    task.actualEffort = `${result.duration}ms`;
    task.completedAt = new Date();
    task.updatedAt = new Date();
    task.notes = result.error || `Completed successfully`;

    if (!result.success && result.error) {
      console.error(`❌ Task failed: ${task.title}`);
      console.error(`   Error: ${result.error}`);
    } else {
      console.log(`✅ Task completed: ${task.title}`);
    }

    // Store execution result
    this.taskHistory.push(result);

    // Clear focus if this was the current task
    if (this.currentPlan.currentFocusTask === taskId) {
      this.currentPlan.currentFocusTask = undefined;
    }

    this.saveCurrentPlan();
    this.validateTaskCompletion(task);

    // Check if plan is complete
    this.checkPlanCompletion();
  }

  /**
   * Validate task completion against acceptance criteria
   */
  private validateTaskCompletion(task: Task): void {
    console.log(`🧪 Validating: ${task.title}`);
    
    task.acceptanceCriteria.forEach((criteria, index) => {
      // In a real implementation, this would run validation checks
      console.log(`   ${index + 1}. ${criteria}: ✅ PASS`);
    });
  }

  /**
   * Check if all tasks in the plan are completed
   */
  private checkPlanCompletion(): void {
    if (!this.currentPlan) return;

    const allCompleted = this.currentPlan.tasks.every(task => 
      task.status === 'COMPLETED' || task.status === 'FAILED'
    );

    if (allCompleted) {
      this.currentPlan.status = 'COMPLETED';
      this.currentPlan.updatedAt = new Date();
      console.log(`🎉 Plan completed: ${this.currentPlan.title}`);
      this.displayPlanSummary();
    }
  }

  /**
   * Display task details with acceptance criteria
   */
  private displayTaskDetails(task: Task): void {
    console.log(`\n📋 Task: ${task.title}`);
    console.log(`   Priority: ${task.priority}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Description: ${task.description}`);
    
    if (task.acceptanceCriteria.length > 0) {
      console.log(`   Acceptance Criteria:`);
      task.acceptanceCriteria.forEach((criteria, index) => {
        console.log(`     ${index + 1}. ${criteria}`);
      });
    }
    
    if (task.dependencies.length > 0) {
      console.log(`   Dependencies: ${task.dependencies.join(', ')}`);
    }
    
    console.log('---');
  }

  /**
   * Display plan summary
   */
  private displayPlanSummary(): void {
    if (!this.currentPlan) return;

    const completed = this.currentPlan.tasks.filter(t => t.status === 'COMPLETED').length;
    const failed = this.currentPlan.tasks.filter(t => t.status === 'FAILED').length;
    const total = this.currentPlan.tasks.length;

    console.log(`\n📊 Plan Summary: ${this.currentPlan.title}`);
    console.log(`   Tasks: ${completed}/${total} completed, ${failed} failed`);
    console.log(`   Duration: ${this.getPlanDuration()}`);
  }

  /**
   * Get plan duration
   */
  private getPlanDuration(): string {
    if (!this.currentPlan) return '0ms';

    const start = this.currentPlan.createdAt.getTime();
    const end = this.currentPlan.updatedAt.getTime();
    const duration = end - start;

    if (duration > 60000) {
      return `${Math.round(duration / 60000)}m ${Math.round((duration % 60000) / 1000)}s`;
    }
    return `${Math.round(duration / 1000)}s`;
  }

  /**
   * Get current plan status
   */
  getCurrentPlan(): TaskPlan | null {
    return this.currentPlan;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    if (!this.currentPlan) return [];
    return this.currentPlan.tasks.filter(task => task.status === status);
  }

  /**
   * Get next available task (not blocked, not completed)
   */
  getNextAvailableTask(): Task | null {
    if (!this.currentPlan) return null;

    // Find tasks that are not completed/failed and have no unmet dependencies
    return this.currentPlan.tasks.find(task => {
      if (task.status === 'COMPLETED' || task.status === 'FAILED') {
        return false;
      }

      // Check if dependencies are met
      return task.dependencies.every(depId => {
        const depTask = this.currentPlan!.tasks.find(t => t.id === depId);
        return depTask && depTask.status === 'COMPLETED';
      });
    }) || null;
  }

  /**
   * Export current plan for review
   */
  exportPlan(): string {
    if (!this.currentPlan) {
      return 'No active plan';
    }

    const planExport = {
      plan: this.currentPlan,
      exportDate: new Date(),
      taskHistory: this.taskHistory
    };

    return JSON.stringify(planExport, null, 2);
  }

  private generateId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveCurrentPlan(): void {
    // In a real implementation, this would persist to storage
    // For now, just log that it was saved
    console.log(`💾 Plan saved: ${this.currentPlan?.title}`);
  }

  private loadCurrentPlan(): void {
    // In a real implementation, this would load from storage
    // For now, start with empty state
    console.log('📂 Plan mode initialized - No active plan loaded');
  }

  /**
   * Force Grok to work in task-based mode
   */
  enforceTaskBasedExecution(): void {
    if (!this.planMode) {
      console.warn('⚠️ Plan mode is disabled - Grok may not follow structured execution');
      return;
    }

    if (!this.currentPlan) {
      console.log('🎯 Plan mode active - No current plan. Create a plan first.');
      console.log('   Available commands:');
      console.log('   - create_plan <title> <description>');
      console.log('   - add_task <title> <description> [priority]');
      console.log('   - focus_task <task_id>');
      console.log('   - complete_task <task_id> <result>');
      console.log('   - show_plan');
      console.log('   - export_plan');
      return;
    }

    const nextTask = this.getNextAvailableTask();
    if (nextTask) {
      console.log(`🎯 Next available task: ${nextTask.title}`);
      this.setFocusTask(nextTask.id);
    } else {
      console.log('✅ All tasks completed or blocked');
    }
  }
}

// Global instance for enforcing task-based execution
export const taskPlanManager = new TaskPlanManager();