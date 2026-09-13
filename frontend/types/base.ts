import { LocaleCodeType } from './locale';

export type PageType = {
  params: {
    locale: LocaleCodeType;
  };
};

export type GlobalRoleType = {
  uid: 'administrator' | 'user';
};

export type MemberRoleType = {
  uid: 'manager' | 'developer' | 'reporter';
};

export type AutomationStatusType = {
  uid: 'automated' | 'automation-not-required' | 'cannot-be-automated' | 'obsolete';
};

export type TemplateType = {
  uid: 'text' | 'step';
};
