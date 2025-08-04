"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDateTime } from "@/lib/utils/date"
import { useLanguage } from "@/contexts/language-context"

export default function ProjectsPage() {
  const { t, language } = useLanguage()
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", {
        credentials: 'include'
      })
      if (!res.ok) throw new Error("Failed to fetch projects")
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('projects.title')}</h1>
        <Button asChild variant="success">
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('projects.createProject')}
          </Link>
        </Button>
      </div>

      {projects?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">{t('projects.noProjects')}</p>
            <Button asChild variant="success" size="lg">
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('dashboard.createFirstProject')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project: any) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">{project.baseUrl}</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/projects/${project.id}`}>{language === 'ja' ? '詳細を見る' : 'View Details'}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}