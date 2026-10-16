import { dbConnect } from "@/lib/db";
import { FAQ } from "@/models/FAQ";
import { AdminTitle, EmptyState } from "@/components/admin/ui";
import { FaqEditor } from "@/components/admin/RecordEditors";

export default async function FaqsAdmin() {
  await dbConnect();
  const faqs = await FAQ.find().sort({ sortOrder: 1 }).lean();
  return (
    <>
      <AdminTitle title="FAQs" subtitle="Questions shown on the FAQ page, in display order." />
      <div className="space-y-4">
        {faqs.length ? (
          faqs.map((f) => (
            <FaqEditor key={String(f._id)} initial={{ id: String(f._id), question: f.question, answer: f.answer, active: f.active ?? true, sortOrder: f.sortOrder ?? 0 }} />
          ))
        ) : (
          <EmptyState>No FAQs in the database yet. Run the seed script or add one below.</EmptyState>
        )}
        <FaqEditor isNew initial={{ question: "", answer: "", active: true, sortOrder: faqs.length + 1 }} />
      </div>
    </>
  );
}
