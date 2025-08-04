/**
 * ソースコード解析ツール
 * プロジェクトのソースコードを解析して、URL、フォーム、ページ構造を抽出
 */

import fs from 'fs/promises';
import path from 'path';
import * as glob from 'glob';

export interface RouteInfo {
  path: string;
  method: string[];
  file: string;
  params?: string[];
  component?: string;
}

export interface FormElement {
  type: string;
  name?: string;
  id?: string;
  selector: string;
  required?: boolean;
  validation?: string;
}

export interface FormInfo {
  name: string;
  action?: string;
  method?: string;
  elements: FormElement[];
  file: string;
  submitButton?: FormElement;
}

export interface PageInfo {
  route: string;
  title?: string;
  forms: FormInfo[];
  links: string[];
  file: string;
}

export interface AnalysisResult {
  routes: RouteInfo[];
  pages: PageInfo[];
  forms: FormInfo[];
  navigation: string[];
  baseUrl: string;
}

export class SourceCodeAnalyzer {
  private projectPath: string;
  private baseUrl: string;

  constructor(projectPath: string, baseUrl: string = 'http://localhost:3000') {
    this.projectPath = projectPath;
    this.baseUrl = baseUrl;
  }

  /**
   * プロジェクト全体を解析
   */
  async analyze(): Promise<AnalysisResult> {
    console.log(`Analyzing project at: ${this.projectPath}`);
    
    const routes = await this.analyzeRoutes();
    const pages = await this.analyzePages();
    const forms = await this.analyzeForms();
    const navigation = await this.analyzeNavigation();
    
    // 追加: すべてのJSX/TSXファイルを解析
    const allFiles = await this.analyzeAllFiles();
    const additionalForms = await this.extractFormsFromAllFiles(allFiles);
    forms.push(...additionalForms);

    console.log(`Total routes: ${routes.length}`);
    console.log(`Total pages: ${pages.length}`);
    console.log(`Total forms: ${forms.length}`);
    console.log(`Total navigation: ${navigation.length}`);

    return {
      routes,
      pages,
      forms,
      navigation,
      baseUrl: this.baseUrl,
    };
  }

  /**
   * Next.js App Routerのルート情報を解析
   */
  private async analyzeRoutes(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const appDir = path.join(this.projectPath, 'src', 'app');
    
    // ディレクトリの存在を確認
    try {
      await fs.access(appDir);
    } catch (error) {
      console.log('App directory not found:', appDir);
      return routes;
    }
    
    // route.tsファイルを検索
    let routeFiles: string[] = [];
    try {
      routeFiles = await glob.glob('**/route.{ts,tsx,js,jsx}', {
        cwd: appDir,
        absolute: false,
      });
    } catch (error) {
      console.log('No route files found or error:', error);
    }

    for (const file of routeFiles) {
      const fullPath = path.join(appDir, file);
      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch (error) {
        console.log(`Failed to read route file: ${fullPath}`);
        continue;
      }
      
      // HTTPメソッドを検出
      const methods: string[] = [];
      const methodPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/g;
      let match;
      while ((match = methodPattern.exec(content)) !== null) {
        methods.push(match[1]);
      }

      // パスを構築
      const routePath = this.buildRoutePath(file);
      
      // パラメータを検出
      const params = this.extractRouteParams(routePath);

      routes.push({
        path: routePath,
        method: methods,
        file: fullPath,
        params,
      });
    }

    // page.tsxファイルも検索（ページルート）
    let pageFiles: string[] = [];
    try {
      pageFiles = await glob.glob('**/page.{ts,tsx,js,jsx}', {
        cwd: appDir,
        absolute: false,
      });
    } catch (error) {
      console.log('No page files found or error:', error);
    }

    for (const file of pageFiles) {
      const fullPath = path.join(appDir, file);
      const routePath = this.buildRoutePath(file);
      
      routes.push({
        path: routePath,
        method: ['GET'],
        file: fullPath,
        component: file,
      });
    }

    console.log(`Found ${routes.length} routes`);
    return routes;
  }

  /**
   * ページコンポーネントを解析
   */
  private async analyzePages(): Promise<PageInfo[]> {
    const pages: PageInfo[] = [];
    const appDir = path.join(this.projectPath, 'src', 'app');
    
    // ディレクトリの存在を確認
    try {
      await fs.access(appDir);
    } catch (error) {
      console.log('App directory not found for pages:', appDir);
      return pages;
    }
    
    let pageFiles: string[] = [];
    try {
      pageFiles = await glob.glob('**/page.{ts,tsx,js,jsx}', {
        cwd: appDir,
        absolute: false,
      });
    } catch (error) {
      console.log('No page files found in pages analysis:', error);
    }

    for (const file of pageFiles) {
      const fullPath = path.join(appDir, file);
      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch (error) {
        console.log(`Failed to read page file: ${fullPath}`);
        continue;
      }
      const routePath = this.buildRoutePath(file);
      
      const forms = await this.extractFormsFromFile(content, fullPath);
      const links = this.extractLinks(content);
      const title = this.extractPageTitle(content);

      pages.push({
        route: routePath,
        title,
        forms,
        links,
        file: fullPath,
      });
    }

    console.log(`Analyzed ${pages.length} pages`);
    return pages;
  }

  /**
   * フォーム要素を解析
   */
  private async analyzeForms(): Promise<FormInfo[]> {
    const allForms: FormInfo[] = [];
    
    // コンポーネントディレクトリを検索
    let componentFiles: string[] = [];
    const componentsPath = path.join(this.projectPath, 'src', 'components');
    
    // ディレクトリの存在を確認
    try {
      await fs.access(componentsPath);
      componentFiles = await glob.glob('**/*.{ts,tsx,js,jsx}', {
        cwd: componentsPath,
        absolute: false,
      });
    } catch (error) {
      console.log('Components directory not found or error:', error);
    }

    for (const file of componentFiles) {
      const fullPath = path.join(this.projectPath, 'src', 'components', file);
      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch (error) {
        console.log(`Failed to read component file: ${fullPath}`);
        continue;
      }
      const forms = await this.extractFormsFromFile(content, fullPath);
      allForms.push(...forms);
    }

    console.log(`Found ${allForms.length} forms in components`);
    return allForms;
  }

  /**
   * ナビゲーション構造を解析
   */
  private async analyzeNavigation(): Promise<string[]> {
    const navigation: Set<string> = new Set();
    
    // レイアウトファイルを解析
    let layoutFiles: string[] = [];
    const srcPath = path.join(this.projectPath, 'src');
    
    try {
      await fs.access(srcPath);
      layoutFiles = await glob.glob('**/layout.{ts,tsx,js,jsx}', {
        cwd: srcPath,
        absolute: false,
      });
    } catch (error) {
      console.log('No layout files found or error:', error);
    }

    for (const file of layoutFiles) {
      const fullPath = path.join(this.projectPath, 'src', file);
      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch (error) {
        console.log(`Failed to read layout file: ${fullPath}`);
        continue;
      }
      const links = this.extractLinks(content);
      links.forEach(link => navigation.add(link));
    }

    // ナビゲーションコンポーネントを解析
    let navFiles: string[] = [];
    const componentsPath = path.join(this.projectPath, 'src', 'components');
    
    try {
      await fs.access(componentsPath);
      navFiles = await glob.glob('**/*{nav,Nav,menu,Menu}*.{ts,tsx,js,jsx}', {
        cwd: componentsPath,
        absolute: false,
      });
    } catch (error) {
      console.log('No nav files found or error:', error);
    }

    for (const file of navFiles) {
      const fullPath = path.join(this.projectPath, 'src', 'components', file);
      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch (error) {
        console.log(`Failed to read nav file: ${fullPath}`);
        continue;
      }
      const links = this.extractLinks(content);
      links.forEach(link => navigation.add(link));
    }

    console.log(`Found ${navigation.size} navigation links`);
    return Array.from(navigation);
  }

  /**
   * ファイルからフォーム要素を抽出
   */
  private async extractFormsFromFile(content: string, filePath: string): Promise<FormInfo[]> {
    const forms: FormInfo[] = [];
    
    // <form>タグを検出
    const formPattern = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    const formMatches = content.matchAll(formPattern);
    
    for (const match of formMatches) {
      const formContent = match[0];
      const elements: FormElement[] = [];
      
      // input要素を抽出
      const inputPattern = /<(?:input|Input)[^>]*(?:type=["']([^"']*)["'])?[^>]*(?:name=["']([^"']*)["'])?[^>]*(?:id=["']([^"']*)["'])?[^>]*(?:required)?[^>]*\/?>/gi;
      const inputMatches = formContent.matchAll(inputPattern);
      
      for (const inputMatch of inputMatches) {
        const type = inputMatch[1] || 'text';
        const name = inputMatch[2];
        const id = inputMatch[3];
        const required = inputMatch[0].includes('required');
        
        elements.push({
          type,
          name,
          id,
          selector: id ? `#${id}` : name ? `[name="${name}"]` : `input[type="${type}"]`,
          required,
        });
      }
      
      // textarea要素を抽出
      const textareaPattern = /<(?:textarea|Textarea)[^>]*(?:name=["']([^"']*)["'])?[^>]*(?:id=["']([^"']*)["'])?[^>]*(?:required)?[^>]*>/gi;
      const textareaMatches = formContent.matchAll(textareaPattern);
      
      for (const textareaMatch of textareaMatches) {
        const name = textareaMatch[1];
        const id = textareaMatch[2];
        const required = textareaMatch[0].includes('required');
        
        elements.push({
          type: 'textarea',
          name,
          id,
          selector: id ? `#${id}` : name ? `[name="${name}"]` : 'textarea',
          required,
        });
      }
      
      // select要素を抽出
      const selectPattern = /<(?:select|Select)[^>]*(?:name=["']([^"']*)["'])?[^>]*(?:id=["']([^"']*)["'])?[^>]*>/gi;
      const selectMatches = formContent.matchAll(selectPattern);
      
      for (const selectMatch of selectMatches) {
        const name = selectMatch[1];
        const id = selectMatch[2];
        
        elements.push({
          type: 'select',
          name,
          id,
          selector: id ? `#${id}` : name ? `[name="${name}"]` : 'select',
        });
      }
      
      // 送信ボタンを検出
      const submitPattern = /<(?:button|Button)[^>]*(?:type=["']submit["'])[^>]*>([^<]*)</gi;
      const submitMatch = submitPattern.exec(formContent);
      
      if (submitMatch) {
        elements.push({
          type: 'submit',
          selector: 'button[type="submit"]',
        });
      }
      
      // フォーム情報を作成
      const formName = this.extractFormName(formContent);
      const action = this.extractFormAction(formContent);
      const method = this.extractFormMethod(formContent);
      
      forms.push({
        name: formName || `Form in ${path.basename(filePath)}`,
        action,
        method,
        elements,
        file: filePath,
      });
    }
    
    // React Hook Formの使用を検出
    if (content.includes('useForm') || content.includes('react-hook-form')) {
      const hookForms = this.extractReactHookForms(content, filePath);
      forms.push(...hookForms);
    }
    
    return forms;
  }

  /**
   * React Hook Formを解析
   */
  private extractReactHookForms(content: string, filePath: string): FormInfo[] {
    const forms: FormInfo[] = [];
    
    // register関数の使用を検出
    const registerPattern = /register\(["']([^"']+)["']/g;
    const fields: Set<string> = new Set();
    let match;
    
    while ((match = registerPattern.exec(content)) !== null) {
      fields.add(match[1]);
    }
    
    if (fields.size > 0) {
      const elements: FormElement[] = Array.from(fields).map(field => ({
        type: 'input',
        name: field,
        selector: `[name="${field}"]`,
      }));
      
      // handleSubmitを検出
      if (content.includes('handleSubmit')) {
        elements.push({
          type: 'submit',
          selector: 'button[type="submit"]',
        });
      }
      
      forms.push({
        name: `React Hook Form in ${path.basename(filePath)}`,
        elements,
        file: filePath,
      });
    }
    
    return forms;
  }

  /**
   * リンクを抽出
   */
  private extractLinks(content: string): string[] {
    const links: Set<string> = new Set();
    
    // Next.js Linkコンポーネント
    const linkPattern = /<Link[^>]*href=["']([^"']+)["']/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      links.add(match[1]);
    }
    
    // 通常のaタグ
    const aPattern = /<a[^>]*href=["']([^"']+)["']/g;
    while ((match = aPattern.exec(content)) !== null) {
      links.add(match[1]);
    }
    
    // router.push
    const routerPattern = /router\.push\(["']([^"']+)["']\)/g;
    while ((match = routerPattern.exec(content)) !== null) {
      links.add(match[1]);
    }
    
    return Array.from(links);
  }

  /**
   * ページタイトルを抽出
   */
  private extractPageTitle(content: string): string | undefined {
    // h1タグ
    const h1Pattern = /<h1[^>]*>([^<]+)</;
    const h1Match = h1Pattern.exec(content);
    if (h1Match) return h1Match[1];
    
    // title prop
    const titlePattern = /title=["']([^"']+)["']/;
    const titleMatch = titlePattern.exec(content);
    if (titleMatch) return titleMatch[1];
    
    return undefined;
  }

  /**
   * フォーム名を抽出
   */
  private extractFormName(formContent: string): string | undefined {
    const namePattern = /name=["']([^"']+)["']/;
    const match = namePattern.exec(formContent);
    return match ? match[1] : undefined;
  }

  /**
   * フォームアクションを抽出
   */
  private extractFormAction(formContent: string): string | undefined {
    const actionPattern = /action=["']([^"']+)["']/;
    const match = actionPattern.exec(formContent);
    return match ? match[1] : undefined;
  }

  /**
   * フォームメソッドを抽出
   */
  private extractFormMethod(formContent: string): string | undefined {
    const methodPattern = /method=["']([^"']+)["']/;
    const match = methodPattern.exec(formContent);
    return match ? match[1] : undefined;
  }

  /**
   * ルートパスを構築
   */
  private buildRoutePath(filePath: string): string {
    const dir = path.dirname(filePath);
    const parts = dir.split(path.sep);
    
    // (group)形式のディレクトリを除外
    const cleanParts = parts.filter(part => !part.match(/^\(.+\)$/));
    
    // [param]形式を:paramに変換
    const pathParts = cleanParts.map(part => {
      if (part.match(/^\[.+\]$/)) {
        return `:${part.slice(1, -1)}`;
      }
      return part;
    });
    
    // api/を/api/に変換
    if (pathParts[0] === 'api') {
      return '/' + pathParts.join('/');
    }
    
    // ルートの場合
    if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === '')) {
      return '/';
    }
    
    let routePath = '/' + pathParts.join('/');
    
    // 末尾の.を削除
    if (routePath.endsWith('/.')) {
      routePath = routePath.slice(0, -2);
    }
    
    // ルートパスが空になった場合は/にする
    if (routePath === '' || routePath === '/') {
      routePath = '/';
    }
    
    return routePath;
  }

  /**
   * ルートパラメータを抽出
   */
  private extractRouteParams(routePath: string): string[] {
    const params: string[] = [];
    const paramPattern = /:([^/]+)/g;
    let match;
    
    while ((match = paramPattern.exec(routePath)) !== null) {
      params.push(match[1]);
    }
    
    return params;
  }

  /**
   * すべてのJSX/TSXファイルを解析
   */
  private async analyzeAllFiles(): Promise<string[]> {
    const allFiles: string[] = [];
    
    // srcディレクトリ全体を検索
    const srcPath = path.join(this.projectPath, 'src');
    
    try {
      await fs.access(srcPath);
      const files = await glob.glob('**/*.{tsx,jsx,ts,js}', {
        cwd: srcPath,
        absolute: false,
        ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
      });
      
      for (const file of files) {
        allFiles.push(path.join(srcPath, file));
      }
      
      console.log(`Found ${allFiles.length} total files to analyze`);
    } catch (error) {
      console.log('Error accessing src directory:', error);
    }
    
    return allFiles;
  }

  /**
   * すべてのファイルからフォームを抽出
   */
  private async extractFormsFromAllFiles(files: string[]): Promise<FormInfo[]> {
    const forms: FormInfo[] = [];
    
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Reactコンポーネント内のフォームを検出
        if (content.includes('<form') || content.includes('<Form') || 
            content.includes('onSubmit') || content.includes('handleSubmit')) {
          
          const fileForms = await this.extractFormsFromFile(content, filePath);
          
          // 追加: Inputコンポーネントの検出
          if (fileForms.length === 0 && 
              (content.includes('<Input') || content.includes('<input') ||
               content.includes('TextField') || content.includes('FormControl'))) {
            
            const elements = this.extractInputElements(content, filePath);
            if (elements.length > 0) {
              forms.push({
                name: `Form in ${path.basename(filePath)}`,
                elements,
                file: filePath,
              });
            }
          } else {
            forms.push(...fileForms);
          }
        }
      } catch (error) {
        // エラーはログに記録して続行
        console.log(`Error reading file ${filePath}:`, error);
      }
    }
    
    console.log(`Found ${forms.length} additional forms from all files`);
    return forms;
  }

  /**
   * Input要素を抽出
   */
  private extractInputElements(content: string, filePath: string): FormElement[] {
    const elements: FormElement[] = [];
    
    // Inputコンポーネントのパターン
    const patterns = [
      /<(?:Input|input)[^>]*(?:name|id|type|placeholder)=["']([^"']*)["'][^>]*\/?>/, 
      /<(?:TextField|FormControl)[^>]*(?:name|id|label)=["']([^"']*)["'][^>]*\/?>/,
      /<(?:Select|select)[^>]*(?:name|id)=["']([^"']*)["'][^>]*>/,
      /<(?:Textarea|textarea)[^>]*(?:name|id)=["']([^"']*)["'][^>]*>/,
    ];
    
    for (const pattern of patterns) {
      const matches = content.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        const nameOrId = match[1];
        if (nameOrId) {
          elements.push({
            type: 'input',
            name: nameOrId,
            selector: `[name="${nameOrId}"], #${nameOrId}`,
          });
        }
      }
    }
    
    // ボタンを追加
    if (content.includes('type="submit"') || content.includes('type="button"')) {
      elements.push({
        type: 'submit',
        selector: 'button[type="submit"], button[type="button"]',
      });
    }
    
    return elements;
  }
}