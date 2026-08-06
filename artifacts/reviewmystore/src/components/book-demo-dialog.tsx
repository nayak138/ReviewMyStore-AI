import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateDemoRequest } from "@workspace/api-client-react";

const demoFormSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().email("Please enter a valid email").max(320),
  company: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  locations: z.string().trim().max(50).optional(),
  message: z.string().trim().max(2000).optional(),
  // Honeypot: hidden from real users, only bots fill it in.
  website: z.string().max(200).optional(),
});

type DemoFormValues = z.infer<typeof demoFormSchema>;

export function BookDemoDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      locations: "",
      message: "",
      website: "",
    },
  });

  const mutation = useCreateDemoRequest({
    mutation: {
      onSuccess: () => setSubmitted(true),
      onError: () => {
        toast({
          title: "Couldn't send your request",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (values: DemoFormValues) => {
    mutation.mutate({
      data: {
        name: values.name,
        email: values.email,
        company: values.company || undefined,
        phone: values.phone || undefined,
        locations: values.locations || undefined,
        message: values.message || undefined,
        website: values.website || undefined,
      },
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset for the next visit after the closing animation.
      setTimeout(() => {
        setSubmitted(false);
        form.reset();
        mutation.reset();
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Request received!
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Thanks for your interest — we'll reach out within one business
              day to schedule your personalized demo.
            </p>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </motion.div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" />
                Book a Demo
              </DialogTitle>
              <DialogDescription>
                Tell us a bit about your business and we'll schedule a
                personalized walkthrough.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Honeypot field — invisible to humans, catches bots. */}
                <div
                  aria-hidden="true"
                  className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
                >
                  <label htmlFor="demo-website-field">Website</label>
                  <input
                    id="demo-website-field"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    {...form.register("website")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="jane@company.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Restaurants" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="locations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of locations</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you like to see?</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Tell us about your goals, current review process, or any questions…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Sending…" : "Request Demo"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll only use your details to schedule your demo — no spam.
                </p>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
