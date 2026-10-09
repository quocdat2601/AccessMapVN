import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center"><div><p className="text-sm font-bold text-teal-700">404</p><h1 className="mt-2 text-2xl font-extrabold text-slate-950">Không tìm thấy trang</h1><p className="mt-2 text-sm text-slate-500">Đường dẫn này chưa tồn tại trong cổng quản trị.</p><Link href="/admin" className={buttonVariants({ className: "mt-5" })}>Về tổng quan</Link></div></main>;
}
