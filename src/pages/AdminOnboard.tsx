import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Trash2, Loader2, Copy, CheckCircle, Users } from "lucide-react";

interface MemberInput {
  id: string;
  email: string;
  displayName: string;
  password: string;
  role: string;
}

interface OnboardResult {
  success: boolean;
  orgId: string;
  clientId: string;
  companyName: string;
  members: Array<{
    email: string;
    role: string;
    status: string;
    password?: string;
    userId?: string;
    error?: string;
  }>;
}

export default function AdminOnboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [members, setMembers] = useState<MemberInput[]>([
    { id: crypto.randomUUID(), email: "", displayName: "", password: "", role: "owner" }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Only super_admin can access
  if (user?.email !== "moohamedwahed@gmail.com") {
    return <Navigate to="/" />;
  }

  const addMember = () => {
    if (members.length >= 20) return;
    setMembers([...members, {
      id: crypto.randomUUID(), email: "", displayName: "", password: "", role: "sales_rep"
    }]);
  };

  const removeMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter(m => m.id !== id));
  };

  const updateMember = (id: string, field: keyof MemberInput, value: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      toast({ title: "خطأ", description: "اكتب اسم الشركة", variant: "destructive" });
      return;
    }

    const validMembers = members.filter(m => m.email.trim());
    if (validMembers.length === 0) {
      toast({ title: "خطأ", description: "أضف عضو واحد على الأقل", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("onboard-client", {
        body: {
          companyName: companyName.trim(),
          members: validMembers.map(m => ({
            email: m.email.trim(),
            password: m.password.trim() || companyName.trim() + "@2026",
            role: m.role,
            displayName: m.displayName.trim() || m.email.split("@")[0]
          }))
        }
      });

      if (error) throw error;

      if (data?.success) {
        setResult(data);
        toast({ title: "تم بنجاح!", description: `تم إنشاء ${companyName} مع ${validMembers.length} عضو` });
      } else {
        throw new Error(data?.error || "حصل خطأ");
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCompanyName("");
    setMembers([{ id: crypto.randomUUID(), email: "", displayName: "", password: "", role: "owner" }]);
    setResult(null);
  };

  const roles = [
    { value: "owner", label: "Owner — صاحب الشركة" },
    { value: "sales_manager", label: "Sales Manager — مدير المبيعات" },
    { value: "marketing_manager", label: "Marketing — مدير التسويق" },
    { value: "team_leader", label: "Team Leader — تيم ليدر" },
    { value: "sales_rep", label: "Sales Rep — سيلز" },
    { value: "viewer", label: "Viewer — مشاهد فقط" },
  ];

  return (
    <DashboardLayout>
      <div className="page-fade-in max-w-4xl mx-auto space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إضافة شركة جديدة</h1>
            <p className="text-sm text-muted-foreground">خطوة واحدة لإنشاء كل شيء — الشركة والفريق والصلاحيات</p>
          </div>
        </div>

        {!result ? (
          <div className="space-y-6">
            {/* Company Name */}
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="block text-sm font-medium text-foreground mb-2">اسم الشركة</label>
              <Input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="مثال: شركة النيل للتسويق"
                className="text-lg h-12"
              />
            </div>

            {/* Members */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">أعضاء الفريق</h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {members.length}/20
                  </span>
                </div>
                <Button onClick={addMember} variant="outline" size="sm" disabled={members.length >= 20}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة عضو
                </Button>
              </div>

              <div className="space-y-3">
                {members.map((member, idx) => (
                  <div key={member.id} className="flex gap-3 items-start p-4 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-xs text-muted-foreground mt-3 min-w-[24px]">#{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Input
                        value={member.email}
                        onChange={e => updateMember(member.id, "email", e.target.value)}
                        placeholder="email@company.com"
                        type="email"
                        dir="ltr"
                      />
                      <Input
                        value={member.displayName}
                        onChange={e => updateMember(member.id, "displayName", e.target.value)}
                        placeholder="الاسم (اختياري)"
                      />
                      <Input
                        value={member.password}
                        onChange={e => updateMember(member.id, "password", e.target.value)}
                        placeholder={`الباسورد (افتراضي: ${companyName || "company"}@2026)`}
                        dir="ltr"
                      />
                      <Select value={member.role} onValueChange={v => updateMember(member.id, "role", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                      disabled={members.length <= 1}
                      className="text-destructive hover:text-destructive mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !companyName.trim()}
              className="w-full h-12 text-lg font-bold"
              size="lg"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin ml-2" /> جاري الإنشاء...</>
              ) : (
                <><Building2 className="h-5 w-5 ml-2" /> إنشاء الشركة</>
              )}
            </Button>
          </div>
        ) : (
          /* Results */
          <div className="space-y-6">
            {/* Success Header */}
            <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-6 text-center">
              <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-1">
                تم إنشاء {result.companyName} بنجاح!
              </h2>
              <p className="text-muted-foreground">
                {result.members.length} عضو تم إضافتهم
              </p>
            </div>

            {/* IDs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">ORG_ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-hidden" dir="ltr">
                    {result.orgId}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.orgId, "org")}>
                    {copiedField === "org" ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">CLIENT_ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-hidden" dir="ltr">
                    {result.clientId}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.clientId, "client")}>
                    {copiedField === "client" ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-3 text-right">العضو</th>
                    <th className="p-3 text-right">الدور</th>
                    <th className="p-3 text-right">الباسورد</th>
                    <th className="p-3 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {result.members.map((m, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="p-3" dir="ltr">{m.email}</td>
                      <td className="p-3">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {m.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {m.password && (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded" dir="ltr">{m.password}</code>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(m.password!, `pass-${i}`)}>
                              {copiedField === `pass-${i}` ? <CheckCircle className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          m.status === "created" ? "bg-green-500/10 text-green-400"
                            : m.status === "existing_user_added" ? "bg-blue-500/10 text-blue-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {m.status === "created" ? "تم الإنشاء"
                            : m.status === "existing_user_added" ? "مستخدم موجود — تم الإضافة"
                            : m.error || "خطأ"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* n8n Note */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">الخطوة التالية:</p>
              <p>استخدم الـ ORG_ID و CLIENT_ID في n8n workflow لربط بيانات الحملات والليدز.</p>
            </div>

            {/* Reset */}
            <Button onClick={resetForm} variant="outline" className="w-full">
              إضافة شركة أخرى
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
