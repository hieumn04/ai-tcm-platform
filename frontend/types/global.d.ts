// Extend Window interface to include our custom global handlers
interface Window {
  // Handler to remove a case from selection when viewing case details
  __removeCaseFromSelection?: (caseId: number) => void;
}
