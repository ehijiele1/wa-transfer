import { PostContent, ATestConfig } from '../types/socialMedia';
export declare class ABTestingService {
    private supabase;
    private activeTests;
    constructor();
    createABTest(test: Omit<ATestConfig, 'id' | 'status' | 'results'>): Promise<ATestConfig>;
    startABTest(testId: string): Promise<ATestConfig>;
    stopABTest(testId: string): Promise<ATestConfig>;
    getABTestResults(testId: string): Promise<ATestConfig | null>;
    getAllABTests(): Promise<ATestConfig[]>;
    createVariant(testId: string, variant: {
        content: PostContent;
        audience?: string[];
    }): Promise<string>;
    getTestRecommendations(testId: string): Promise<any>;
    private validateABTest;
    private distributeVariants;
    private scheduleVariant;
    private calculateTestResults;
    private getVariantMetrics;
    private getBestVariant;
    private getWinningContent;
    private getSuggestedImprovements;
    private getNextSteps;
    private saveABTest;
    private updateABTest;
    private loadABTestFromDatabase;
    private loadAllABTestsFromDatabase;
    getABTestStatistics(): Promise<any>;
    getTestTemplates(): Promise<any[]>;
}
export default ABTestingService;
//# sourceMappingURL=abTesting.d.ts.map