import { ProjectForm } from "@/components/forms/ProjectForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Propose a project" };

export default function ProposePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <PageHeader
        title="Propose a project"
        lede="For community groups with a site in mind that isn't listed yet. KHB and the City will check ownership, safety and waste handling before it becomes a project. You don't need to have everything figured out."
      />
      <ProjectForm kind="COMMUNITY_GROUP" />
    </div>
  );
}
