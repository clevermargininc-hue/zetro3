import Link from "next/link";

export function StandardsRequiredNotice({ message }: { message: string }) {
  return (
    <div className="panel rounded-lg p-5">
      <p className="page-kicker">Standards required</p>
      <h2 className="mt-2 text-lg font-semibold">Go to Standards for documents scoring</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
      <Link href="/standards" className="btn btn-blue mt-4">
        Go to Standards
      </Link>
    </div>
  );
}
