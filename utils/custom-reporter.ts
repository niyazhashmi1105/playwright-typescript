import type {
    FullConfig, FullResult, Reporter, Suite, TestCase, TestResult,
    TestStep
  } from '@playwright/test/reporter';
import { error } from 'console';
  
  class MyReporter implements Reporter {
    onBegin(config: FullConfig, suite: Suite) {
      console.log(`Starting the run with ${suite.allTests().length} tests`);
      console.log(`Suite Title: ${suite.allTests.name.toString()}`);
    }
  
    onTestBegin(test: TestCase, result: TestResult) {
      console.log(`Starting test: ${test.title}`);
    }
  
    onTestEnd(test: TestCase, result: TestResult) {
      console.log(`Finished test: ${test.title}: ${result.status}`);
    }
  
    onEnd(result: FullResult) {
      console.log(`Finished the run: ${result.status}`);
    }

    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
        if(step.category === 'test.step') {
            console.log(`Starting test step: ${step.title}}`);
        }
    
}

    onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
        if(step.category === 'test.step') {
            console.log(`Starting test step: ${step.title}: ${result.status}`);
        }
    }   
  }
  
  export default MyReporter;