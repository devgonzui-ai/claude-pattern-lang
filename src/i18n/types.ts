/**
 * サポート言語
 */
export type Language = "en" | "ja";

/**
 * プロバイダ名のメッセージ
 */
export interface ProviderMessages {
  anthropic: string;
  openai: string;
  gemini: string;
  ollama: string;
  deepseek: string;
  claudeCode: string;
}

/**
 * CLI説明のメッセージ
 */
export interface CliMessages {
  description: string;
  commands: {
    init: {
      description: string;
      options: {
        default: string;
      };
    };
    analyze: {
      description: string;
      options: {
        session: string;
        file: string;
        since: string;
        project: string;
        dryRun: string;
        autoApprove: string;
      };
    };
    list: {
      description: string;
      options: {
        type: string;
        search: string;
        json: string;
      };
    };
    show: {
      description: string;
      argument: string;
      options: {
        name: string;
      };
    };
    add: {
      description: string;
      options: {
        file: string;
        interactive: string;
      };
    };
    remove: {
      description: string;
      argument: string;
      options: {
        name: string;
      };
    };
    sync: {
      description: string;
      argument: string;
      options: {
        project: string;
        global: string;
        dryRun: string;
        force: string;
      };
    };
    config: {
      description: string;
      options: {
        provider: string;
        set: string;
      };
    };
    metrics: {
      description: string;
      options: {
        clear: string;
        stats: string;
        days: string;
      };
    };
    create: {
      description: string;
    };
    session: {
      description: string;
      argument: string;
      options: {
        project: string;
        all: string;
      };
    };
  };
}

/**
 * 各コマンドのメッセージ
 */
export interface CommandMessages {
  init: {
    configExists: string;
    usingDefault: string;
    configuringLlm: string;
    creatingDir: string;
    creatingConfig: string;
    creatingCatalog: string;
    completed: string;
    nextSteps: string;
    step1ApiKey: string;
    step1Ollama: string;
    step2Analyze: string;
    step3Sync: string;
    hookInstructions: string;
    hookStep1: string;
    hookStep2: string;
    error: string;
  };
  analyze: {
    noSessions: string;
    noMatchingSessions: string;
    analyzingSessions: string;
    llmProvider: string;
    configNotFound: string;
    configCustomize: string;
    sessionError: string;
    noNewPatterns: string;
    extractedPatterns: string;
    dryRun: string;
    saveConfirm: string;
    saveCancelled: string;
    patternsSaved: string;
    error: string;
    progressFormat: string;
  };
  list: {
    noPatterns: string;
  };
  show: {
    notFound: string;
    ambiguousId: string;
  };
  add: {
    fileNotFound: string;
    validationError: string;
    added: string;
    interactive: string;
    promptName: string;
    promptType: string;
    promptContext: string;
    promptSolution: string;
  };
  remove: {
    notFound: string;
    removed: string;
    ambiguousId: string;
  };
  sync: {
    emptyCatalog: string;
    patternNotFound: string;
    ambiguousId: string;
    syncingPatterns: string;
    changeHeader: string;
    dryRun: string;
    createConfirm: string;
    saveConfirm: string;
    cancelled: string;
    synced: string;
    error: string;
  };
  config: {
    notFound: string;
    runInitFirst: string;
    loadError: string;
    currentLlmConfig: string;
    provider: string;
    model: string;
    apiKeyEnv: string;
    baseUrl: string;
    analysisConfig: string;
    autoAnalyze: string;
    minSessionLength: string;
    syncConfig: string;
    autoSync: string;
    selectProvider: string;
    inputModel: string;
    inputApiKeyEnv: string;
    inputOllamaHost: string;
    updated: string;
    invalidFormat: string;
    keyNotFound: string;
    setValue: string;
    error: string;
  };
  metrics: {
    cleared: string;
    hint: string;
    hintClear: string;
    hintStats: string;
    hintDays: string;
    error: string;
  };
  session: {
    dirNotFound: string;
    checkProject: string;
    noSessions: string;
    noAnalyzable: string;
    analyzed: string;
    error: string;
  };
  common: {
    patternNotFound: string;
    ambiguousIdPrefix: string;
    confirmYN: string;
  };
}

/**
 * バリデーションメッセージ
 */
export interface ValidationMessages {
  nameRequired: string;
  typeInvalid: string;
  contextRequired: string;
  solutionRequired: string;
}

/**
 * エラーメッセージ
 */
export interface ErrorMessages {
  ambiguousId: string;
}

/**
 * プロバイダー固有のエラーメッセージ
 */
export interface ProviderErrorMessages {
  apiKeyMissing: string;
  invalidResponse: string;
}

/**
 * UIメッセージ
 */
export interface UiMessages {
  tableHeaders: {
    id: string;
    name: string;
    type: string;
    context: string;
    timestamp: string;
    command: string;
    duration: string;
    calls: string;
    tokens: string;
  };
  labels: {
    metricsSummary: string;
    commandHistory: string;
    statistics: string;
    llmCallDetails: string;
    noMetrics: string;
    noCommandHistory: string;
    providerNotSupported: string;
    sessions: string;
    messages: string;
    inputTokens: string;
    outputTokens: string;
    cacheCreation: string;
    cacheRead: string;
    cacheEfficiency: string;
    totalMessages: string;
    totalInput: string;
    totalOutput: string;
    totalCache: string;
    avgEfficiency: string;
    summary: string;
    commands: string;
    llmCalls: string;
    totalTokens: string;
    avgResponse: string;
    totalTime: string;
  };
}

/**
 * 全メッセージ型
 */
export interface Messages {
  cli: CliMessages;
  messages: CommandMessages;
  validation: ValidationMessages;
  errors: ErrorMessages;
  providers: ProviderMessages;
  providerErrors: ProviderErrorMessages;
  ui: UiMessages;
}
