import { describe, expect, test, assert } from 'vitest';
import { changeStatus, includeExcludeTestCases } from './runsControl';
import { CaseType } from '@/types/case';
import { RunCaseType } from '@/types/run';

describe('changeStatus function', () => {
  test('should update status of an existing runCase', () => {
    const changeCaseId = 1;
    const platform: 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api' = 'web';
    const newStatus = 1;
    const currentTestCases: CaseType[] = [
      {
        id: 1,
        title: 'Test case 1',
        state: 0,
        priority: 1,
        type: 0,
        automationStatus: 0,
        description: 'Description 1',
        template: 0,
        preConditions: '',
        expectedResults: 'Expected 1',
        folderId: 1,
        stepsDetail: 'Steps 1',
        statusLabel: 'pending',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        runCases: [
          {
            id: 1,
            runId: 1,
            caseId: 1,
            editState: 'notChanged',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
            statuses: [{ platform: 'web', status: 0 }],
          },
        ],
      },
    ];

    const newTestCases = changeStatus(changeCaseId, platform, newStatus, currentTestCases);

    if (newTestCases[0] && newTestCases[0].runCases && newTestCases[0].runCases[0]) {
      expect(newTestCases[0].runCases[0].statuses[0].status).toBe(1);
      expect(newTestCases[0].runCases[0].editState).toBe('changed');
    } else {
      assert.fail("runCases doesn't exist");
    }
  });

  test('should overwrite existing status', () => {
    const changeCaseId = 1;
    const platform: 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api' = 'web';
    const newStatus = 1;
    const overwriteStatus = 2;
    const currentTestCases: CaseType[] = [
      {
        id: 1,
        title: 'Test case 1',
        state: 0,
        priority: 1,
        type: 0,
        automationStatus: 0,
        description: 'Description 1',
        template: 0,
        preConditions: '',
        expectedResults: 'Expected 1',
        folderId: 1,
        stepsDetail: 'Steps 1',
        statusLabel: 'pending',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        runCases: [
          {
            id: 1,
            runId: 1,
            caseId: 1,
            editState: 'notChanged',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
            statuses: [{ platform: 'web', status: 0 }],
          },
        ],
      },
    ];

    const newTestCases = changeStatus(changeCaseId, platform, newStatus, currentTestCases);
    const overwrittenCases = changeStatus(changeCaseId, platform, overwriteStatus, newTestCases);

    if (overwrittenCases[0] && overwrittenCases[0].runCases && overwrittenCases[0].runCases[0]) {
      expect(overwrittenCases[0].runCases[0].statuses[0].status).toBe(2);
      expect(overwrittenCases[0].runCases[0].editState).toBe('changed');
    } else {
      assert.fail("runCases doesn't exist");
    }
  });

  test('should add new status for a platform that doesn\'t exist', () => {
    const changeCaseId = 1;
    const platform: 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api' = 'ios';
    const newStatus = 1;
    const currentTestCases: CaseType[] = [
      {
        id: 1,
        title: 'Test case 1',
        state: 0,
        priority: 1,
        type: 0,
        automationStatus: 0,
        description: 'Description 1',
        template: 0,
        preConditions: '',
        expectedResults: 'Expected 1',
        folderId: 1,
        stepsDetail: 'Steps 1',
        statusLabel: 'pending',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        runCases: [
          {
            id: 1,
            runId: 1,
            caseId: 1,
            editState: 'notChanged',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
            statuses: [{ platform: 'web', status: 0 }],
          },
        ],
      },
    ];

    const newTestCases = changeStatus(changeCaseId, platform, newStatus, currentTestCases);

    if (newTestCases[0] && newTestCases[0].runCases && newTestCases[0].runCases[0]) {
      // Should have 2 statuses now: original web and new ios
      expect(newTestCases[0].runCases[0].statuses).toHaveLength(2);
      const iosStatus = newTestCases[0].runCases[0].statuses.find(s => s.platform === 'ios');
      expect(iosStatus?.status).toBe(1);
      expect(newTestCases[0].runCases[0].editState).toBe('changed');
    } else {
      assert.fail("runCases doesn't exist");
    }
  });

  test('should not update status if runCase editState is deleted', () => {
    const changeCaseId = 1;
    const platform: 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api' = 'web';
    const newStatus = 1;
    const currentTestCases: CaseType[] = [
      {
        id: 1,
        title: 'Test case 1',
        state: 0,
        priority: 1,
        type: 0,
        automationStatus: 0,
        description: 'Description 1',
        template: 0,
        preConditions: '',
        expectedResults: 'Expected 1',
        folderId: 1,
        stepsDetail: 'Steps 1',
        statusLabel: 'pending',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        runCases: [
          {
            id: 1,
            runId: 1,
            caseId: 1,
            editState: 'deleted',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
            statuses: [{ platform: 'web', status: 0 }],
          },
        ],
      },
    ];

    const newTestCases = changeStatus(changeCaseId, platform, newStatus, currentTestCases);

    if (newTestCases[0] && newTestCases[0].runCases && newTestCases[0].runCases[0]) {
      expect(newTestCases[0].runCases[0].statuses[0].status).toBe(0);
      expect(newTestCases[0].runCases[0].editState).toBe('deleted');
    } else {
      assert.fail("runCases doesn't exist");
    }
  });
});

describe('includeExcludeTestCases function', () => {
  test('should include test case by creating new runCase if none exists', () => {
    const isInclude = true;
    const keys = [1];
    const runId = 1;
    const currentTestCases: CaseType[] = [
      {
        id: 1,
        title: 'Test case 1',
        state: 0,
        priority: 1,
        type: 0,
        automationStatus: 0,
        description: 'Description 1',
        template: 0,
        preConditions: '',
        expectedResults: 'Expected 1',
        folderId: 1,
        stepsDetail: 'Steps 1',
        statusLabel: 'pending',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        runCases: [],
      },
    ];

    const newTestCases = includeExcludeTestCases(isInclude, keys, runId, currentTestCases);

    if (newTestCases[0] && newTestCases[0].runCases && newTestCases[0].runCases[0]) {
      expect(newTestCases[0].runCases[0].editState).toBe('new');
    } else {
      assert.fail("runCases doesn't exist");
    }
  });

  test('should include test case by changing editState from deleted to changed', () => {
    const isInclude = true;
    const keys = [1];
    const runId = 1;
    const currentTestCases: CaseType[] = [
      {
        id: 1,
        title: 'Test case 1',
        state: 0,
        priority: 1,
        type: 0,
        automationStatus: 0,
        description: 'Description 1',
        template: 0,
        preConditions: '',
        expectedResults: 'Expected 1',
        folderId: 1,
        stepsDetail: 'Steps 1',
        statusLabel: 'pending',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        runCases: [
          {
            id: 1,
            runId: 1,
            caseId: 1,
            editState: 'deleted',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
            statuses: [],
          },
        ],
      },
    ];

    const newTestCases = includeExcludeTestCases(isInclude, keys, runId, currentTestCases);

    if (newTestCases[0] && newTestCases[0].runCases && newTestCases[0].runCases[0]) {
      expect(newTestCases[0].runCases[0].editState).toBe('changed');
    } else {
      assert.fail("runCases doesn't exist");
    }
  });

  test('should exclude test case by marking runCase as deleted', () => {
    const isInclude = false;
    const keys = [1];
    const runId = 1;
    const currentTestCases: CaseType[] = [
      {
        id: 1,
        title: 'Test case 1',
        state: 0,
        priority: 1,
        type: 0,
        automationStatus: 0,
        description: 'Description 1',
        template: 0,
        preConditions: '',
        expectedResults: 'Expected 1',
        folderId: 1,
        stepsDetail: 'Steps 1',
        statusLabel: 'pending',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        runCases: [
          {
            id: 1,
            runId: 1,
            caseId: 1,
            editState: 'notChanged',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
            statuses: [{ platform: 'web', status: 1 }],
          },
        ],
      },
    ];

    const newTestCases = includeExcludeTestCases(isInclude, keys, runId, currentTestCases);

    // After exclusion, runCases should be empty
    expect(newTestCases[0].runCases).toEqual([]);
  });
});
