import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Account = () => {
  const [tab, setTab] = useState("login");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("This is a demo — accounts are not stored.");
  };
  return (
    <div className="container-page max-w-md py-12">
      <h1 className="mb-6 text-3xl font-bold">My account</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign in</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6">
            <Field id="email" label="Email" type="email" />
            <Field id="password" label="Password" type="password" />
            <Button className="w-full rounded-full">Sign in</Button>
          </form>
        </TabsContent>
        <TabsContent value="register">
          <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6">
            <Field id="r-name" label="Full name" />
            <Field id="r-email" label="Email" type="email" />
            <Field id="r-password" label="Password" type="password" />
            <Button className="w-full rounded-full">Create account</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function Field({ id, label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="mt-1.5" {...rest} />
    </div>
  );
}
export default Account;