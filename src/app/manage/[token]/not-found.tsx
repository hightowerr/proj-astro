import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card className="p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Booking not found</h1>
          <p className="text-sm text-muted-foreground">
            This booking link is invalid, expired, or has already been used.
            Please check the link and try again.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Return home</Link>
        </Button>
      </Card>
    </div>
  );
}
