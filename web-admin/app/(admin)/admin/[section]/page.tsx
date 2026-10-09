import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";
import { placeholderPageMeta } from "@/shared/config/navigation";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

export function generateStaticParams() {
  return Object.keys(placeholderPageMeta).filter((section) => section !== "ho-so-dong-gop").map((section) => ({ section }));
}

export default async function PlaceholderPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const meta = placeholderPageMeta[section];
  if (!meta) notFound();
  const Icon = meta.icon;

  return (
    <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 xl:p-7">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="size-5" /></div>
        <div><div className="flex items-center gap-2"><h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{meta.title}</h1><Badge variant="neutral">Sắp ra mắt</Badge></div><p className="mt-0.5 text-sm text-slate-500">Không gian nghiệp vụ dành cho đội ngũ vận hành AccessMapVN.</p></div>
      </div>
      <Card className="mt-6 grid min-h-[430px] place-items-center border-dashed p-8 text-center">
        <div className="max-w-md"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Construction className="size-7" /></div><h2 className="mt-5 text-lg font-bold text-slate-950">Khu vực đang được hoàn thiện</h2><p className="mt-2 text-sm leading-6 text-slate-500">Điều hướng đã sẵn sàng để tích hợp màn hình nghiệp vụ và API ASP.NET Core trong giai đoạn tiếp theo.</p><div className="mt-5 flex justify-center gap-2"><Link href="/admin" className={buttonVariants({ variant: "outline" })}><ArrowLeft className="size-4" />Về tổng quan</Link><span className={buttonVariants({ variant: "secondary" })}><Sparkles className="size-4" />Prototype frontend</span></div></div>
      </Card>
    </div>
  );
}
