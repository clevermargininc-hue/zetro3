import { UploadForm } from "@/components/upload-form";
import { PageHeader } from "@/components/ui";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Step 1 of 3"
        title="Upload recordings"
        description="Add files here first. Nothing is scored on this page. When the batch finishes, go to Prepare."
      />
      <UploadForm />
    </div>
  );
}
