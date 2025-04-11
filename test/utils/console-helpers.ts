import { jest } from '@jest/globals';

// Define a type for the console.error function signature using unknown
type ConsoleErrorType = (message?: unknown, ...optionalParams: unknown[]) => void;

/**
 * Temporarily suppresses console.error messages that match the expected pattern
 * during the execution of a provided function (typically an async test operation).
 * Unexpected console.error messages will still be logged.
 *
 * @param expectedMessage The exact string or a RegExp to match against the console.error message.
 * @param fnToRun The async function to execute while suppression is active.
 * @returns The result of the fnToRun function.
 */
export async function suppressExpectedConsoleError<T>(
  expectedMessage: string | RegExp,
  fnToRun: () => T | Promise<T>
): Promise<T> {
  // Use the defined type for the original function
  const originalConsoleError: ConsoleErrorType = console.error;

  // Use unknown in the mock implementation signature
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation((message?: unknown, ...args: unknown[]) => {
      const messageStr = String(message); // String conversion handles unknown
      const shouldSuppress =
        expectedMessage instanceof RegExp
          ? expectedMessage.test(messageStr)
          : messageStr === expectedMessage;

      if (!shouldSuppress) {
        // Call the original implementation for unexpected errors
        // We still need to handle the potential type mismatch for the spread
        // Using Function.prototype.apply is a safer way to call with dynamic args
        Function.prototype.apply.call(originalConsoleError, console, [message, ...args]);
      }
      // If it matches, do nothing (suppress)
    });

  try {
    // Execute the function that is expected to trigger the error log
    return await fnToRun();
  } finally {
    // Restore the original console.error
    consoleErrorSpy.mockRestore();
  }
}
