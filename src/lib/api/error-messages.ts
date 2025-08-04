export const getErrorMessage = (key: string, lang: string = 'en'): string => {
  const messages: Record<string, Record<string, string>> = {
    // Authentication errors
    'auth.invalid_credentials': {
      en: 'Invalid email or password',
      ja: 'メールアドレスまたはパスワードが正しくありません'
    },
    'auth.user_exists': {
      en: 'User already exists',
      ja: 'ユーザーは既に存在します'
    },
    'auth.unauthorized': {
      en: 'Unauthorized',
      ja: '認証が必要です'
    },
    'auth.session_expired': {
      en: 'Session expired',
      ja: 'セッションの有効期限が切れました'
    },
    
    // Project errors
    'project.not_found': {
      en: 'Project not found',
      ja: 'プロジェクトが見つかりません'
    },
    'project.create_failed': {
      en: 'Failed to create project',
      ja: 'プロジェクトの作成に失敗しました'
    },
    'project.update_failed': {
      en: 'Failed to update project',
      ja: 'プロジェクトの更新に失敗しました'
    },
    'project.delete_failed': {
      en: 'Failed to delete project',
      ja: 'プロジェクトの削除に失敗しました'
    },
    
    // Test suite errors
    'suite.not_found': {
      en: 'Test suite not found',
      ja: 'テストスイートが見つかりません'
    },
    'suite.create_failed': {
      en: 'Failed to create test suite',
      ja: 'テストスイートの作成に失敗しました'
    },
    'suite.update_failed': {
      en: 'Failed to update test suite',
      ja: 'テストスイートの更新に失敗しました'
    },
    'suite.delete_failed': {
      en: 'Failed to delete test suite',
      ja: 'テストスイートの削除に失敗しました'
    },
    
    // Test case errors
    'testcase.not_found': {
      en: 'Test case not found',
      ja: 'テストケースが見つかりません'
    },
    'testcase.create_failed': {
      en: 'Failed to create test case',
      ja: 'テストケースの作成に失敗しました'
    },
    'testcase.update_failed': {
      en: 'Failed to update test case',
      ja: 'テストケースの更新に失敗しました'
    },
    'testcase.delete_failed': {
      en: 'Failed to delete test case',
      ja: 'テストケースの削除に失敗しました'
    },
    
    // Test execution errors
    'test.execution_failed': {
      en: 'Test execution failed',
      ja: 'テスト実行に失敗しました'
    },
    'test.browser_launch_failed': {
      en: 'Failed to launch browser',
      ja: 'ブラウザの起動に失敗しました'
    },
    'test.screenshot_failed': {
      en: 'Failed to take screenshot',
      ja: 'スクリーンショットの取得に失敗しました'
    },
    'test.timeout': {
      en: 'Test execution timed out',
      ja: 'テスト実行がタイムアウトしました'
    },
    
    // Analysis errors
    'analysis.failed': {
      en: 'Source code analysis failed',
      ja: 'ソースコード解析に失敗しました'
    },
    'analysis.no_source': {
      en: 'No source code found',
      ja: 'ソースコードが見つかりません'
    },
    'analysis.unsupported_framework': {
      en: 'Unsupported framework',
      ja: 'サポートされていないフレームワークです'
    },
    
    // Validation errors
    'validation.required_field': {
      en: 'This field is required',
      ja: '必須項目です'
    },
    'validation.invalid_email': {
      en: 'Invalid email address',
      ja: 'メールアドレスが正しくありません'
    },
    'validation.invalid_url': {
      en: 'Invalid URL',
      ja: 'URLが正しくありません'
    },
    'validation.password_mismatch': {
      en: 'Passwords do not match',
      ja: 'パスワードが一致しません'
    },
    'validation.password_too_short': {
      en: 'Password must be at least 8 characters',
      ja: 'パスワードは8文字以上必要です'
    },
    
    // Generic errors
    'error.network': {
      en: 'Network error occurred',
      ja: 'ネットワークエラーが発生しました'
    },
    'error.server': {
      en: 'Server error occurred',
      ja: 'サーバーエラーが発生しました'
    },
    'error.unknown': {
      en: 'An unknown error occurred',
      ja: '不明なエラーが発生しました'
    },
    'error.invalid_request': {
      en: 'Invalid request',
      ja: '無効なリクエストです'
    },
    'error.not_found': {
      en: 'Resource not found',
      ja: 'リソースが見つかりません'
    }
  }

  return messages[key]?.[lang] || messages[key]?.['en'] || key
}