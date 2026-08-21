"use client";

import { useState } from "react";



export function SalesForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      workEmail: formData.get("workEmail") as string,
      companyName: formData.get("companyName") as string,
      message: formData.get("message") as string,
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit request.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 animate-in zoom-in-95 duration-500">
        <div className="h-16 w-16 bg-good/10 text-good rounded-full flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-ink mb-2">Request Received!</h3>
        <p className="text-[14px] text-muted">
          Thank you for your interest in Zetro. Our team will review your request and get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Full Name</span>
          <input
            name="fullName"
            required
            type="text"
            className="field"
            placeholder="Jane Doe"
          />
        </label>
        
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Company Name</span>
          <input
            name="companyName"
            required
            type="text"
            className="field"
            placeholder="Acme Corp"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Work Email</span>
        <input
          name="workEmail"
          required
          type="email"
          className="field"
          placeholder="jane@acmecorp.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">How can we help? (Optional)</span>
        <textarea
          name="message"
          rows={3}
          className="field resize-none"
          placeholder="Tell us about your team size, current QA process, or anything else..."
        ></textarea>
      </label>

      {error && <p className="alert-error text-[13px]">{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-lg btn-blue mt-2">
        {loading ? "Sending Request..." : "Request a Demo"}
      </button>
      
      <p className="text-[12px] text-muted text-center mt-2">
        By submitting this form, you agree to our privacy policy.
      </p>
    </form>
  );
}
