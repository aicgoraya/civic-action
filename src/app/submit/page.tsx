import { ProjectForm } from "@/components/forms/ProjectForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Submit a project" };

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <PageHeader
        title="Submit a project"
        lede="For approved and invited partners: city departments, super neighborhood councils, schools, civic clubs and nonprofits. KHB verifies your organization, confirms the site, arranges tools and waste pickup, then publishes it for volunteers."
      />
      <ProjectForm kind="PARTNER" />
    </div>
  );
}
