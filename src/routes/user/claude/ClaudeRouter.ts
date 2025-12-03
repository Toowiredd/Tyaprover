import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { spawn } from 'child_process';
import BaseApi from '../../../api/BaseApi';
import ApiStatusCodes from '../../../api/ApiStatusCodes';
import Logger from '../../../utils/Logger';

const router = express.Router();

interface ClaudeRequestBody {
    prompt: string;
    // Future additions: sessionId?: string;
}

router.post('/assistant', (req: Request, res: Response, next: NextFunction) => {
    const { prompt } = req.body as ClaudeRequestBody;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        res.send(new BaseApi(ApiStatusCodes.STATUS_ERROR_BAD_NAME, 'Prompt is required and must be a non-empty string.'));
        return;
    }

    const claudeArgs = ['-p', prompt, '--output-format', 'json'];

    let stdoutData = '';
    let stderrData = '';

    const claudeProcess = spawn('claude', claudeArgs);

    claudeProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });

    claudeProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
        // Log stderr immediately for debugging, but don't assume it's always a fatal error yet.
        Logger.w(`ClaudeRouter: claude CLI stderr: ${data.toString()}`);
    });

    claudeProcess.on('error', (error) => {
        Logger.e(`ClaudeRouter: Failed to start claude CLI: ${error.message}`);
        if (!res.headersSent) {
            // Use 503 Service Unavailable if the service itself (Claude CLI) can't be reached/started
            res.status(503).send(new BaseApi(ApiStatusCodes.STATUS_ERROR_GENERIC, `Failed to start Claude CLI: ${error.message}`));
            return;
        }
    });

    claudeProcess.on('close', (code) => {
        // If headers already sent, do nothing further.
        if (res.headersSent) {
            return;
        }

        if (code !== 0) {
            Logger.e(`ClaudeRouter: claude CLI exited with code ${code}. Stderr: ${stderrData}. Stdout: ${stdoutData}`);
            // Prefer stderr if available for the error message
            const errorMessage = stderrData.trim() || `Claude CLI exited with code ${code}.`;
            res.status(500).send(new BaseApi(ApiStatusCodes.STATUS_ERROR_GENERIC, errorMessage));
            return;
        }

        // Exit code is 0
        if (!stdoutData.trim()) {
            Logger.w(`ClaudeRouter: claude CLI exited with code 0 but no stdout data. Stderr: ${stderrData}`);
            // If there was something in stderr, it might be relevant warning/info even on success
            const message = stderrData.trim() ? `Claude CLI produced no output. Stderr: ${stderrData}` : 'Claude CLI produced no output.';
            const response = new BaseApi(ApiStatusCodes.STATUS_OK_PARTIALLY, message);
            response.data = { rawOutput: stderrData.trim() };
            res.status(200).send(response);
            return;
        }

        try {
            // Attempt to parse stdout as JSON.
            // The previous regex approach (match(/({.*})/s)) can be problematic if there's leading/trailing non-JSON text.
            // A more robust way is to try parsing directly, assuming claude CLI --output-format json is well-behaved.
            // If not, a more advanced streaming JSON parser or cleanup logic would be needed.
            const parsedResult = JSON.parse(stdoutData);
            const response = new BaseApi(ApiStatusCodes.STATUS_OK, 'Claude response received.');
            response.data = parsedResult;
            res.send(response);
        } catch (error: any) {
            Logger.e(`ClaudeRouter: Error parsing Claude CLI JSON response: ${error.message}. Raw stdout: ${stdoutData}. Stderr: ${stderrData}`);
            // Send the raw output if parsing fails, as it might still be useful, but indicate it's not the expected JSON.
            const response = new BaseApi(ApiStatusCodes.STATUS_OK_PARTIALLY, 'Received non-JSON or malformed JSON response from Claude.');
            response.data = { rawOutput: stdoutData, stderrOutput: stderrData.trim() };
            res.status(200).send(response);
        }
    });
});

export default router;
