import { LocaleCodeType } from '@/types/locale'
import { ProjectHome } from './ProjectHome'
import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'

export type HomeMessages = {
  folders: string
  testCases: string
  testRuns: string
  progress: string
  testClassification: string
  byType: string
  byPriority: string
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: LocaleCodeType }
}) {
  const t = await getTranslations({ locale, namespace: 'Home' })
  return {
    title: `${t('home')} | UnitTCMS`,
    robots: { index: false, follow: false },
  }
}

export default function Page({ params }: { params: { projectId: string } }) {
  const t = useTranslations('Home')
  const messages = {
    folders: t('Folders'),
    testCases: t('test_cases'),
    testRuns: t('test_runs'),
    progress: t('progress'),
    testClassification: t('test_classification'),
    byType: t('by_type'),
    byPriority: t('by_priority'),
  }

  return (
    <>
      <ProjectHome projectId={params.projectId} messages={messages} />
    </>
  )
}
