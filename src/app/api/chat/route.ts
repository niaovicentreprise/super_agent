import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow } from '@/lib/workflow';

export async function POST(request: NextRequest) {
  try {
    const { message, workflowId, zapierToken } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!workflowId || !zapierToken) {
      return NextResponse.json(
        { error: 'Missing workflowId or zapierToken' },
        { status: 400 }
      );
    }

    const result = await runWorkflow({ input_as_text: message, workflowId, zapierToken });

    return NextResponse.json({ 
      response: result?.response || 'No response received' 
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
