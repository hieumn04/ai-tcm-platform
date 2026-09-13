import { ProjectType } from '@/types/project';
import { testTypes, priorities } from '@/config/selection';
import { CasePriorityCountType, CaseTypeCountType, FolderCaseCount } from '@/types/chart';
import { FolderType } from '@/types/folder';

//aggregate folder info
function aggregateFolderInfo(folders: FolderType[]): FolderCaseCount[] {
  return folders.map((folder) => ({
    folderId: folder.id,
    folderName: folder.name,
    caseCount: folder.cases?.length || 0,
  }));
}
// aggregate folder, case, run mum
function aggregateBasicInfo(project: ProjectType) {
  const folderNum = project?.folderCount ?? 0;
  const runNum = project?.runCount ?? 0;
  const caseNum = project?.caseCount ?? 0;
  const aiCasesCount = project?.aiCasesCount ?? 0; // Assuming backend provides this

  return { folderNum, runNum, caseNum, aiCasesCount };
}


function aggregateTestType(project: ProjectType): CaseTypeCountType[] {
  // count how many test cases are for each type
  const typesCounts: number[] = testTypes.map((entry) => {
    return 0;
  });
  (project.folders || []).forEach((folder) => {
    (folder.cases || []).forEach((testcase) => {
      const type = testcase.type;
      typesCounts[type]++;
    });
  });

  const result: CaseTypeCountType[] = [];
  for (let type = 0; type <= testTypes.length; type++) {
    result.push({ type: type, count: typesCounts[type] });
  }

  return result;
}

function aggregateTestPriority(project: ProjectType) {
  // count how many test cases are for each priority
  const priorityCounts: number[] = priorities.map((entry) => {
    return 0;
  });
  (project.folders || []).forEach((folder) => {
    (folder.cases || []).forEach((testcase) => {
      const priority = testcase.priority;
      priorityCounts[priority]++;
    });
  });

  const result: CasePriorityCountType[] = [];
  for (let priority = 0; priority <= priorities.length; priority++) {
    result.push({ priority: priority, count: priorityCounts[priority] });
  }

  return result;
}

// function aggregateProgress(project: ProjectType, testRunCaseStatusMessages: TestRunCaseStatusMessages) {
//   type ChartSeries = { name: string; data: number[] };
//   let series: ChartSeries[] = testRunCaseStatus.map((status) => {
//     return { name: testRunCaseStatusMessages[status.uid], data: [] };
//   });
//   let categories: string[] = [];

//   project.runs.forEach((run) => {
//     if (!run.runCases) {
//       return;
//     }

//     run.runCases.forEach((runCase) => {
//       const createdAtDate = new Date(runCase.createdAt);
//       const dateString = createdAtDate.toISOString().slice(0, 10);

//       const alreadyExists = categories.includes(dateString);
//       if (!alreadyExists) {
//         categories.push(dateString);
//         series.forEach((itr) => {
//           itr.data.push(0);
//         });
//       }
//     });
//   });

//   project.runs.forEach((run) => {
//     if (!run.runCases) {
//       return;
//     }

//     run.runCases.forEach((runCase) => {
//       const createdAtDate = new Date(runCase.createdAt);
//       const dateString = createdAtDate.toISOString().slice(0, 10);
//       const index = categories.indexOf(dateString);

//       const target = series[runCase.status];
//       target.data[index]++;
//     });
//   });

//   return { series, categories };
// }

export { aggregateBasicInfo, aggregateTestType, aggregateTestPriority, 
  // aggregateProgress,
   aggregateFolderInfo };
