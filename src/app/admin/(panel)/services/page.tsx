import { dbConnect } from "@/lib/db";
import { Service } from "@/models/Service";
import { AdminTitle, EmptyState } from "@/components/admin/ui";
import { ServiceEditor } from "@/components/admin/RecordEditors";

export default async function ServicesAdmin() {
  await dbConnect();
  const services = await Service.find().sort({ kind: -1, sortOrder: 1 }).lean();
  return (
    <>
      <AdminTitle title="Services" subtitle="The main bin cleaning service and quoted additional services. Additional services are never charged online." />
      <div className="space-y-6">
        {services.length ? (
          services.map((s) => (
            <ServiceEditor
              key={String(s._id)}
              initial={{
                id: String(s._id),
                title: s.title,
                summary: s.summary ?? "",
                description: s.description ?? "",
                imageUrl: s.imageUrl ?? "",
                imageAlt: s.imageAlt ?? "",
                kind: s.kind as "primary" | "additional",
                active: s.active ?? true,
                sortOrder: s.sortOrder ?? 0,
              }}
            />
          ))
        ) : (
          <EmptyState>No services in the database yet. Run the seed script to load the default services.</EmptyState>
        )}
        <ServiceEditor isNew initial={{ title: "", summary: "", description: "", imageUrl: "", imageAlt: "", kind: "additional", active: true, sortOrder: services.length + 1 }} />
      </div>
    </>
  );
}
