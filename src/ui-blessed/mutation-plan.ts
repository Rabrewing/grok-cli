/**
 * MutationPlan System - Industry-standard AI terminal flow
 * Plan → Preview → Confirm → Execute → Report
 */

export type MutationType = 'WRITE_FILE' | 'PATCH_FILE' | 'RUN_BASH' | 'GIT_OP' | 'OTHER';

export type RiskLevel = 'LOW' | 'MED' | 'HIGH';

export type ExecutionState = 
  | 'IDLE'
  | 'THINKING' 
  | 'PLANNING'
  | 'PREVIEW_READY'
  | 'PENDING_CONFIRMATION'
  | 'EXECUTING'
  | 'DONE'
  | 'ERROR';

export interface MutationPlanItem {
  type: MutationType;
  label: string;
  target: string;
  preview: string;
  risk: RiskLevel;
  canAutoApply: boolean;
  toolCall?: any;
  workingDirectory?: string;
  commandPreview?: {
    preview: string;
    risk: RiskLevel;
    details: string[];
  };
}

export interface MutationPlan {
  id: string;
  summary: string;
  items: MutationPlanItem[];
  createdAt: Date;
  state: ExecutionState;
  autoApproved: boolean;
}

export interface ExecutionReport {
  planId: string;
  summary: string;
  results: ExecutionResult[];
  duration: number;
  state: ExecutionState;
}

export interface ExecutionResult {
  item: MutationPlanItem;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  filesAffected?: string[];
}

export class MutationPlanBuilder {
  private plan: MutationPlan;
  private idCounter = 0;

  constructor() {
    this.plan = {
      id: this.generateId(),
      summary: '',
      items: [],
      createdAt: new Date(),
      state: 'PLANNING',
      autoApproved: false
    };
  }

  private generateId(): string {
    return `plan_${Date.now()}_${++this.idCounter}`;
  }

  addItem(type: MutationType, target: string, preview: string, options: Partial<MutationPlanItem> = {}): void {
    const item: MutationPlanItem = {
      type,
      label: this.generateLabel(type, target),
      target,
      preview,
      risk: this.assessRisk(type, target),
      canAutoApply: false,
      toolCall: options.toolCall,
      workingDirectory: options.workingDirectory,
      ...options
    };

    // Generate command preview for bash operations
    if (type === 'RUN_BASH') {
      item.commandPreview = this.generateCommandPreview(target, options.workingDirectory);
    }

    this.plan.items.push(item);
  }

  private generateLabel(type: MutationType, target: string): string {
    switch (type) {
      case 'WRITE_FILE':
        return `Write ${target.split('/').pop() || target}`;
      case 'PATCH_FILE':
        return `Edit ${target.split('/').pop() || target}`;
      case 'RUN_BASH':
        return `Run: ${target}`;
      case 'GIT_OP':
        return `Git: ${target}`;
      default:
        return target;
    }
  }

  private assessRisk(type: MutationType, target: string): RiskLevel {
    // Assess risk based on operation type and content
    const destructivePatterns = [
      /rm\s+[-rf]/,
      /rm\s+.*\*/,
      /mv\s+.*\//,
      /git\s+reset/,
      /git\s+clean/,
      /chmod\s+777/,
      /sudo\s+rm/,
      /dd\s+if=/,
      /mkfs/,
      /fdisk/,
      /format/
    ];

    const isDestructive = destructivePatterns.some(pattern => pattern.test(target));

    if (type === 'RUN_BASH' && isDestructive) {
      return 'HIGH';
    } else if (type === 'RUN_BASH') {
      return 'MED';
    } else if (type === 'WRITE_FILE' || type === 'PATCH_FILE') {
      return 'LOW';
    } else {
      return 'MED';
    }
  }

  /**
   * Generate command preview with working directory and risk assessment
   */
  generateCommandPreview(command: string, workingDirectory?: string): { preview: string; risk: RiskLevel; details: string[] } {
    const cwd = workingDirectory || process.cwd();
    const details: string[] = [];
    
    // Add working directory
    details.push(`Directory: ${cwd}`);
    
    // Assess risk
    const risk = this.assessRisk('RUN_BASH', command);
    details.push(`Risk Level: ${risk}`);
    
    // Add command-specific details
    if (command.includes('git')) {
      details.push('Git operation detected');
    } else if (command.includes('npm') || command.includes('yarn') || command.includes('pnpm')) {
      details.push('Package manager operation');
    } else if (command.includes('docker')) {
      details.push('Docker operation');
    } else if (command.includes('sudo')) {
      details.push('Elevated privileges required');
    }
    
    // Create preview
    const preview = command.length > 60 ? `${command.substring(0, 57)}...` : command;
    
    return { preview, risk, details };
  }

  setSummary(summary: string): void {
    this.plan.summary = summary;
  }

  setAutoApproved(approved: boolean): void {
    this.plan.autoApproved = approved;
  }

  setState(state: ExecutionState): void {
    this.plan.state = state;
  }

  build(): MutationPlan {
    if (this.plan.items.length === 0) {
      throw new Error('MutationPlan must have at least one item');
    }

    // Transition to preview ready if we have items
    if (this.plan.state === 'PLANNING') {
      this.plan.state = 'PREVIEW_READY';
    }

    return { ...this.plan };
  }

  reset(): void {
    this.plan = {
      id: this.generateId(),
      summary: '',
      items: [],
      createdAt: new Date(),
      state: 'PLANNING',
      autoApproved: false
    };
  }

  hasItems(): boolean {
    return this.plan.items.length > 0;
  }

  getItemCount(): number {
    return this.plan.items.length;
  }

  getHighRiskItems(): MutationPlanItem[] {
    return this.plan.items.filter(item => item.risk === 'HIGH');
  }

  getMediumRiskItems(): MutationPlanItem[] {
    return this.plan.items.filter(item => item.risk === 'MED');
  }

  getLowRiskItems(): MutationPlanItem[] {
    return this.plan.items.filter(item => item.risk === 'LOW');
  }
}

export class ExecutionStateManager {
  private currentState: ExecutionState = 'IDLE';
  private currentPlan: MutationPlan | null = null;
  private sessionAutoApprove = false;
  private showDetails = false;
  private showDiffView = false;
  private stateChangeCallbacks: ((state: ExecutionState, plan?: MutationPlan) => void)[] = [];

  constructor() {
    this.loadSessionState();
  }

  private loadSessionState(): void {
    // Load from environment or localStorage-like storage
    try {
      const stored = process.env.BREWGROK_AUTO_APPROVE;
      this.sessionAutoApprove = stored === 'true';
    } catch {
      this.sessionAutoApprove = false;
    }
  }

  saveSessionState(): void {
    // In Node.js context, we could use a file-based approach
    // For now, set environment variable for current session
    try {
      process.env.BREWGROK_AUTO_APPROVE = this.sessionAutoApprove.toString();
    } catch {
      // Silent fail for environments where this isn't available
    }
  }

  onStateChange(callback: (state: ExecutionState, plan?: MutationPlan) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  private notifyStateChange(plan?: MutationPlan): void {
    this.stateChangeCallbacks.forEach(callback => {
      callback(this.currentState, plan);
    });
  }

  transition(newState: ExecutionState, plan?: MutationPlan): void {
    const oldState = this.currentState;
    this.currentState = newState;
    
    if (plan) {
      this.currentPlan = plan;
      plan.state = newState;
    }

    // Log state transitions for debugging
    console.log(`State transition: ${oldState} → ${newState}`);
    
    this.notifyStateChange(plan);
  }

  getCurrentState(): ExecutionState {
    return this.currentState;
  }

  getCurrentPlan(): MutationPlan | null {
    return this.currentPlan;
  }

  setAutoApprove(enabled: boolean): void {
    this.sessionAutoApprove = enabled;
    this.saveSessionState();
  }

  isAutoApproved(): boolean {
    return this.sessionAutoApprove;
  }

  canAutoApply(plan: MutationPlan): boolean {
    return this.sessionAutoApprove && plan.items.every(item => item.canAutoApply);
  }

  reset(): void {
    this.currentState = 'IDLE';
    this.currentPlan = null;
    this.notifyStateChange();
  }

  // State machine validation
  isValidTransition(from: ExecutionState, to: ExecutionState): boolean {
    const validTransitions: Record<ExecutionState, ExecutionState[]> = {
      'IDLE': ['THINKING', 'PLANNING'],
      'THINKING': ['PLANNING', 'ERROR'],
      'PLANNING': ['PREVIEW_READY', 'ERROR'],
      'PREVIEW_READY': ['PENDING_CONFIRMATION', 'EXECUTING', 'ERROR'],
      'PENDING_CONFIRMATION': ['EXECUTING', 'DONE', 'ERROR'],
      'EXECUTING': ['DONE', 'ERROR'],
      'DONE': ['IDLE', 'THINKING', 'PLANNING'],
      'ERROR': ['IDLE', 'THINKING', 'PLANNING']
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  transitionWithValidation(newState: ExecutionState, plan?: MutationPlan): boolean {
    if (!this.isValidTransition(this.currentState, newState)) {
      console.error(`Invalid state transition: ${this.currentState} → ${newState}`);
      return false;
    }

    this.transition(newState, plan);
    return true;
  }

  // Session management methods
  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  toggleDiffView(): void {
    this.showDiffView = !this.showDiffView;
  }

  isDetailsVisible(): boolean {
    return this.showDetails;
  }

  isDiffViewVisible(): boolean {
    return this.showDiffView;
  }

  // Enhanced auto-approve logic
  canAutoApplyPlan(plan: MutationPlan): boolean {
    if (!this.sessionAutoApprove) {
      return false;
    }
    
    // Only auto-apply if there are no HIGH risk items
    const hasHighRisk = plan.items.some(item => item.risk === 'HIGH');
    if (hasHighRisk) {
      console.log('Auto-approve blocked: HIGH risk items present');
      return false;
    }
    
    return plan.items.every(item => item.canAutoApply);
  }

  enableAutoApprove(plan: MutationPlan): void {
    // Only enable auto-approve if no HIGH risk items
    const hasHighRisk = plan.items.some(item => item.risk === 'HIGH');
    if (!hasHighRisk) {
      this.sessionAutoApprove = true;
      this.saveSessionState();
    }
  }

  disableAutoApprove(): void {
    this.sessionAutoApprove = false;
    this.saveSessionState();
  }

  getAutoApproveStatus(): { enabled: boolean; reason?: string } {
    if (!this.sessionAutoApprove) {
      return { enabled: false };
    }
    
    if (this.currentPlan) {
      const hasHighRisk = this.currentPlan.items.some(item => item.risk === 'HIGH');
      if (hasHighRisk) {
        return { enabled: false, reason: 'HIGH risk items present' };
      }
    }
    
    return { enabled: true };
  }
}