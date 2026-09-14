import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, PhoneCall } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateDemoRequest } from "@workspace/api-client-react";

const demoFormSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  leadType: z.enum(["AGENCY", "SINGLE_SHOP"], {
    message: "Please choose an option",
  }),
  shopName: z.string().trim().min(1, "Please enter your shop name").max(200),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(50),
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
      leadType: undefined,
      shopName: "",
      phone: "",
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
        company: values.shopName,
        leadType: values.leadType,
        phone: values.phone,
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
              Trial request received!
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Thanks for your interest — we'll reach out within one business
              day to plan your 7-day trial.
            </p>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </motion.div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-primary" />
                Start your 7-day trial
              </DialogTitle>
              <DialogDescription>
                Share the basics and our team will contact you to plan the
                right first week for your business.
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
                <FormField
                  control={form.control}
                  name="leadType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What best describes you? *</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="What best describes you?">
                          {[
                            { value: "AGENCY" as const, label: "Agency", description: "I manage multiple businesses or locations." },
                            { value: "SINGLE_SHOP" as const, label: "Single Shop", description: "I run one business or location." },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={field.value === option.value}
                              onClick={() => field.onChange(option.value)}
                              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                field.value === option.value
                                  ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent"
                              }`}
                            >
                              <span className="block text-sm font-semibold">{option.label}</span>
                              <span className="mt-1 block text-xs leading-relaxed">{option.description}</span>
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    name="shopName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop name *</FormLabel>
                        <FormControl>
                          <Input placeholder="The Green Room" {...field} />
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
                        <FormLabel>Phone number *</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+91 98765 43210"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full font-semibold"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Sending…" : "Request your trial"} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  No marketing spam. We only use your details to contact you
                  about your 7-day trial.
                </p>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
