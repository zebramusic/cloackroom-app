"use client";
import { type ChangeEvent, useState } from "react";

export default function EmailTestPage() {
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          handoverId: `test-${Date.now()}`,
          testEmail: testEmail || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTestEmail(event.target.value);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Email Test</h1>

      <div className="space-y-4">
        <div>
          <label htmlFor="testEmail" className="block text-sm font-medium mb-2">
            Test Email Address (optional)
          </label>
          <input
            id="testEmail"
            type="email"
            value={testEmail}
            onChange={handleEmailChange}
            placeholder="test@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-600 mt-1">
            Leave empty to use default test email. Admin emails will be sent to
            all admin users in the database.
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Test Emails"}
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 border rounded-md">
          <h3 className="text-lg font-semibold mb-2">Result:</h3>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Setup Instructions:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
          <li>Create a Gmail account or use an existing one</li>
          <li>Enable 2-Step Verification in your Google Account</li>
          <li>Go to Google Account → Security → App passwords</li>
          <li>Generate an app password for &quot;Mail&quot;</li>
          <li>Add these environment variables to your .env.local file:</li>
        </ol>
        <pre className="mt-3 text-xs bg-yellow-100 p-2 rounded overflow-auto">
          {`GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Admin emails are automatically fetched from admin users in the database`}
        </pre>
        <p className="mt-2 text-sm text-yellow-700">
          <strong>Note:</strong> Make sure you have admin users created in the
          system with valid email addresses.
        </p>
      </div>
    </div>
  );
}
