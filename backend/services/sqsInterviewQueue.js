let SQSClient = null;
let SendMessageCommand = null;
let ReceiveMessageCommand = null;
let DeleteMessageCommand = null;
let GetQueueAttributesCommand = null;

try {
    ({
        SQSClient,
        SendMessageCommand,
        ReceiveMessageCommand,
        DeleteMessageCommand,
        GetQueueAttributesCommand,
    } = require('@aws-sdk/client-sqs'));
} catch (error) {
    console.warn('SQS SDK unavailable. Install @aws-sdk/client-sqs to enable interview queue.');
}

const queueUrl = process.env.AWS_SQS_INTERVIEW_QUEUE_URL || '';
const region = process.env.AWS_SQS_REGION || process.env.AWS_REGION || 'ap-south-1';
const depthCacheTtlMs = 10 * 1000;

let queueDepthCache = {
    value: 0,
    expiresAt: 0,
};

const sqsClient = SQSClient ? new SQSClient({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
        : undefined,
}) : null;

const isQueueConfigured = () => Boolean(queueUrl && sqsClient);

const enqueueInterviewJob = async (payload) => {
    if (!isQueueConfigured()) {
        throw new Error('Interview queue is not configured');
    }

    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(payload),
    });

    const result = await sqsClient.send(command);
    return {
        messageId: result.MessageId,
    };
};

const receiveInterviewMessages = async (maxNumberOfMessages = 5, waitSeconds = 20, visibilityTimeout = 300) => {
    if (!isQueueConfigured()) return [];

    const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages,
        WaitTimeSeconds: waitSeconds,
        VisibilityTimeout: visibilityTimeout,
        AttributeNames: ['ApproximateReceiveCount'],
    });

    const response = await sqsClient.send(command);
    return response.Messages || [];
};

const deleteInterviewMessage = async (receiptHandle) => {
    if (!isQueueConfigured() || !receiptHandle) return;

    const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
    });

    await sqsClient.send(command);
};

const getInterviewQueueDepth = async () => {
    const now = Date.now();
    if (queueDepthCache.expiresAt > now) {
        return queueDepthCache.value;
    }

    if (!isQueueConfigured()) return 0;

    const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
    });

    const response = await sqsClient.send(command);
    const rawCount = response?.Attributes?.ApproximateNumberOfMessages;
    const depth = Number.parseInt(rawCount || '0', 10) || 0;

    queueDepthCache = {
        value: depth,
        expiresAt: now + depthCacheTtlMs,
    };

    return depth;
};

module.exports = {
    enqueueInterviewJob,
    receiveInterviewMessages,
    deleteInterviewMessage,
    getInterviewQueueDepth,
    isQueueConfigured,
};
