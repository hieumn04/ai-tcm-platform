import { PriorityMessages } from '@/types/priority'
import { TestTypeMessages } from '@/types/testType'
import CaseEditor from './CaseEditor'
import { useTranslations } from 'next-intl'
import { LocaleCodeType } from '@/types/locale'

export default function Page({
  params,
}: {
  params: {
    projectId: string
    folderId: string
    caseId: string
    locale: LocaleCodeType
  }
}) {
  const t = useTranslations('Case')
  const messages = {
    backToCases: t('back_to_cases'),
    updating: t('updating'),
    update: t('update'),
    updatedTestCase: t('updated_test_case'),
    basic: t('basic'),
    title: t('title'),
    pleaseEnterTitle: t('please_enter_title'),
    description: t('description'),
    testCaseDescription: t('test_case_description'),
    priority: t('priority'),
    type: t('type'),
    template: t('template'),
    isAuto: t('is_auto'),
    testDetail: t('test_detail'),
    preconditions: t('preconditions'),
    expectedResult: t('expected_result'),
    step: t('step'),
    text: t('text'),
    steps: t('steps'),
    newStep: t('new_step'),
    detailsOfTheStep: t('details_of_the_step'),
    deleteThisStep: t('delete_this_step'),
    insertStep: t('insert_step'),
    attachments: t('attachments'),
    delete: t('delete'),
    download: t('download'),
    deleteFile: t('delete_file'),
    clickToUpload: t('click_to_upload'),
    orDragAndDrop: t('or_drag_and_drop'),
    maxFileSize: t('max_file_size'),
    areYouSureLeave: t('are_you_sure_leave'),
    import: t('import'),
    useAI: t('useAI'),
    createdBy: t('createdBy'),
    complexity: t('complexity'),
  }

  const priorityTranslation = useTranslations('Priority')
  const priorityMessages: PriorityMessages = {
    critical: priorityTranslation('critical'),
    high: priorityTranslation('high'),
    medium: priorityTranslation('medium'),
    low: priorityTranslation('low'),
  }

  const typeTranslation = useTranslations('Type')
  const testTypeMessages: TestTypeMessages = {
    other: typeTranslation('other'),
    security: typeTranslation('security'),
    performance: typeTranslation('performance'),
    accessibility: typeTranslation('accessibility'),
    functional: typeTranslation('functional'),
    acceptance: typeTranslation('acceptance'),
    usability: typeTranslation('usability'),
    smokeSanity: typeTranslation('smoke_sanity'),
    compatibility: typeTranslation('compatibility'),
    destructive: typeTranslation('destructive'),
    regression: typeTranslation('regression'),
    automated: typeTranslation('automated'),
    manual: typeTranslation('manual'),
  }

  return (
    <CaseEditor
      projectId={params.projectId}
      folderId={params.folderId}
      caseId={params.caseId}
      messages={messages}
      priorityMessages={priorityMessages}
      testTypeMessages={testTypeMessages}
    />
  )
}
