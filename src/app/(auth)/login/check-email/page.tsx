import { Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card className="border-ink/10 bg-page/95 shadow-sm shadow-ink/5">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-coral/15">
          <Mail className="h-6 w-6 text-coral" />
        </div>
        <CardTitle className="text-ink">Check your inbox</CardTitle>
        <CardDescription>
          A sign-in link is on its way. Click it to finish signing in.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-ink/60">
        Didn&apos;t get it? Check spam, or head back and try again.
      </CardContent>
    </Card>
  );
}
