import * as batch from '@aws-cdk/aws-batch-alpha';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';
import * as targets from 'aws-cdk-lib/aws-events-targets';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'batch-events');

const queue = new batch.JobQueue(stack, 'MyQueue', {
  computeEnvironments: [
    {
      computeEnvironment: new batch.UnmanagedComputeEnvironment(stack, 'ComputeEnvironment'),
      order: 1,
    },
  ],
});
const job = new batch.EcsJobDefinition(stack, 'MyJob', {
  container: new batch.EcsEc2ContainerDefinition(stack, 'container', {
    image: ContainerImage.fromRegistry('test-repo'),
    cpu: 256,
    memory: cdk.Size.mebibytes(2048),
  }),
});

const timer = new events.Rule(stack, 'Timer', {
  schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
});
timer.addTarget(new targets.BatchJob(queue.jobQueueArn, queue, job.jobDefinitionArn, job));

const timer2 = new events.Rule(stack, 'Timer2', {
  schedule: events.Schedule.rate(cdk.Duration.minutes(2)),
});

const dlq = new sqs.Queue(stack, 'Queue');

timer2.addTarget(new targets.BatchJob(queue.jobQueueArn, queue, job.jobDefinitionArn, job, {
  deadLetterQueue: dlq,
  retryAttempts: 2,
  maxEventAge: cdk.Duration.hours(2),
}));

app.synth();
