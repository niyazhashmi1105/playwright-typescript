import { Reporter, FullConfig, TestCase, TestResult, TestStep, Suite } from '@playwright/test/reporter';

export default class MyReporter implements Reporter {
    onBegin(config: FullConfig, suite: Suite): void {
        console.log(`Starting the run with ${suite.allTests().length} tests`);
        console.log(`Suite Title: ${suite.title}`);
    }

    onTestBegin(test: TestCase, result: TestResult): void {
        console.log(`Starting test: ${test.title}`);
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        console.log(`Finished test: ${test.title}: ${result.status}`);
    }

    onEnd(result: { status?: string }): void {
        console.log(`Finished the run: ${result.status}`);
    }

    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
        if (step.category === 'test.step') {
            console.log(`Starting test step: ${step.title}`);
        }
    }

    onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
        if (step.category === 'test.step') {
            console.log(`Starting test step: ${step.title}: ${result.status}`);
        }
    }
}