import RunEditor from './RunEditor'
import { useTranslations } from 'next-intl'
import { RunMessages } from '@/types/run'
import { PriorityMessages } from '@/types/priority'
import { RunStatusMessages, TestRunCaseStatusMessages } from '@/types/status'
import { TestTypeMessages } from '@/types/testType'
import { CaseMessages } from '@/types/case'
import { LocaleCodeType } from '@/types/locale'

export default function Page({
  params,
}: {
  params: { projectId: string; runId: string; locale: LocaleCodeType }
}) {
  const t = useTranslations('Run')
  const messages: RunMessages = {
    backToRuns: t('back_to_runs'),
    updating: t('updating'),
    update: t('update'),
    updatedTestRun: t('updated_test_run'),
    progress: t('progress'),
    refresh: t('refresh'),
    id: t('id'),
    title: t('title'),
    pleaseEnter: t('please_enter'),
    description: t('description'),
    priority: t('priority'),
    actions: t('actions'),
    status: t('status'),
    appStatus: t('app_status'),
    beStatus: t('be_status'),
    autoStatus: t('auto_status'),
    selectTestCase: t('select_test_case'),
    testCaseSelection: t('test_case_selection'),
    includeInRun: t('include_in_run'),
    excludeFromRun: t('exclude_from_run'),
    noCasesFound: t('no_cases_found'),
    areYouSureLeave: t('are_you_sure_leave'),
    type: t('type'),
    testDetail: t('test_detail'),
    steps: t('steps'),
    preconditions: t('preconditions'),
    expectedResult: t('expected_result'),
    detailsOfTheStep: t('details_of_the_step'),
    close: t('close'),
    testingBadge: t('testing_badge'),
    liveCollaborativeTesting: t('live_collaborative_testing'),
  }

  const rst = useTranslations('RunStatus')
  const runStatusMessages: RunStatusMessages = {
    new: rst('new'),
    inProgress: rst('inProgress'),
    underReview: rst('underReview'),
    rejected: rst('rejected'),
    done: rst('done'),
    closed: rst('closed'),
  }

  const rcst = useTranslations('RunCaseStatus')
  const testRunCaseStatusMessages: TestRunCaseStatusMessages = {
    untested: rcst('untested'),
    passed: rcst('passed'),
    failed: rcst('failed'),
    retest: rcst('retest'),
    skipped: rcst('skipped'),
    pending: rcst('pending'),
  }

  const pt = useTranslations('Priority')
  const priorityMessages: PriorityMessages = {
    critical: pt('critical'),
    high: pt('high'),
    medium: pt('medium'),
    low: pt('low'),
  }

  const tt = useTranslations('Type')
  const testTypeMessages: TestTypeMessages = {
    other: tt('other'),
    security: tt('security'),
    performance: tt('performance'),
    accessibility: tt('accessibility'),
    functional: tt('functional'),
    acceptance: tt('acceptance'),
    usability: tt('usability'),
    smokeSanity: tt('smoke_sanity'),
    compatibility: tt('compatibility'),
    destructive: tt('destructive'),
    regression: tt('regression'),
    automated: tt('automated'),
    manual: tt('manual'),
  }

  const tc = useTranslations('Case')
  const testCaseMessages: CaseMessages = {
    backToCases: tc('back_to_cases'),
    updating: tc('updating'),
    update: tc('update'),
    updatedTestCase: tc('updated_test_case'),
    basic: tc('basic'),
    title: tc('title'),
    pleaseEnterTitle: tc('please_enter_title'),
    description: tc('description'),
    testCaseDescription: tc('test_case_description'),
    priority: tc('priority'),
    type: tc('type'),
    template: tc('template'),
    isAuto: tc('is_auto'),
    testDetail: tc('test_detail'),
    preconditions: tc('preconditions'),
    expectedResult: tc('expected_result'),
    step: tc('step'),
    text: tc('text'),
    steps: tc('steps'),
    newStep: tc('new_step'),
    detailsOfTheStep: tc('details_of_the_step'),
    deleteThisStep: tc('delete_this_step'),
    insertStep: tc('insert_step'),
    attachments: tc('attachments'),
    delete: tc('delete'),
    download: tc('download'),
    deleteFile: tc('delete_file'),
    clickToUpload: tc('click_to_upload'),
    orDragAndDrop: tc('or_drag_and_drop'),
    maxFileSize: tc('max_file_size'),
    areYouSureLeave: tc('are_you_sure_leave'),
    import: tc('import'),
    useAI: tc('useAI'),
    createdBy: tc('createdBy'),
    complexity: tc('complexity'),
  }

  return (
    <RunEditor
      projectId={params.projectId}
      runId={params.runId}
      messages={messages}
      runStatusMessages={runStatusMessages}
      testRunCaseStatusMessages={testRunCaseStatusMessages}
      priorityMessages={priorityMessages}
      testTypeMessages={testTypeMessages}
      testCaseMessages={testCaseMessages}
      locale={params.locale}
    />
  )
}
