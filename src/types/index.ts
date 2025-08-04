export interface IUser {
  id: string
  email: string
  name?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface IProject {
  id: string
  name: string
  description?: string | null
  baseUrl: string
  userId: string
  user?: IUser
  createdAt: Date
  updatedAt: Date
}

export interface ITestSuite {
  id: string
  name: string
  projectId: string
  project?: IProject
  testCases?: ITestCase[]
  createdAt: Date
  updatedAt: Date
}

export interface ITestCase {
  id: string
  name: string
  description?: string | null
  suiteId: string
  suite?: ITestSuite
  steps: any
  config: any
  createdAt: Date
  updatedAt: Date
}

export interface ITestRun {
  id: string
  projectId: string
  project?: IProject
  status: string
  startedAt?: Date | null
  completedAt?: Date | null
  results: any
  screenshots?: IScreenshot[]
  createdAt: Date
}

export interface IScreenshot {
  id: string
  testRunId: string
  testRun?: ITestRun
  browser: string
  pageName: string
  url: string
  filePath: string
  createdAt: Date
}

export type TTestStatus = 'pending' | 'running' | 'completed' | 'failed'