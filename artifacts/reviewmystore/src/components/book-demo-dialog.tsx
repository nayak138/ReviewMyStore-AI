import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
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
import { RadioGroup } from "@/components/ui/radio-group";
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

export function BookDemoDialog({ children, marketingDark = false }: { children: ReactNode; marketingDark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestError, setRequestError] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const submittingRef = useRef(false);
  const openRef = useRef(false);
  const requestGeneration = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

  useEffect(() => () => {
    openRef.current = false;
    requestGeneration.current += 1;
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

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

  const mutation = useCreateDemoRequest();

  const onSubmit = (values: DemoFormValues) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setRequestPending(true);
    setRequestError(false);
    const generation = requestGeneration.current;
    void mutation.mutateAsync({
      data: {
        name: values.name,
        company: values.shopName,
        leadType: values.leadType,
        phone: values.phone,
        website: values.website || undefined,
      },
    }).then(() => {
      if (openRef.current && requestGeneration.current === generation) {
        setSubmitted(true);
      }
    }).catch(() => {
      if (openRef.current && requestGeneration.current === generation) {
        setRequestError(true);
        toast({
          title: "Couldn't send your request",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    }).finally(() => {
      // Closing resets the form, but must not free this guard until the in-flight
      // request actually settles (including after a mutation.reset on close).
      submittingRef.current = false;
      setRequestPending(false);
    });
  };

  const resetView = () => {
    setSubmitted(false);
    setRequestError(false);
    form.reset();
    mutation.reset();
  };

  const handleOpenChange = (next: boolean) => {
    openRef.current = next;
    setOpen(next);
    if (next && resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
      resetView();
    }
    if (!next) {
      requestGeneration.current += 1;
      // Reset for the next visit after the closing animation.
      resetTimer.current = setTimeout(() => {
        resetView();
        resetTimer.current = null;
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={`max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain p-4 text-foreground sm:max-w-lg sm:p-6 ${marketingDark ? "dark" : ""}`}>
        {submitted ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 text-center"
            role="status"
          >
            <DialogTitle className="sr-only">Guided trial request received</DialogTitle>
            <DialogDescription className="sr-only">Our team will follow up to arrange setup.</DialogDescription>
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Guided trial request received
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Thanks for your interest. Our team will follow up using your contact details to arrange setup. Your trial has not started yet.
            </p>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </motion.div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-primary" />
                Request a guided 7-day trial
              </DialogTitle>
              <DialogDescription>
                Share your contact details and our team will follow up to arrange your free guided trial. No 5-Star.AI account or credit card is needed to request it.
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
                      <FormLabel id="trial-lead-type-label">What best describes you? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2"
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-labelledby="trial-lead-type-label"
                        >
                          {[
                            { value: "AGENCY" as const, label: "Agency", description: "I manage multiple businesses or locations." },
                            { value: "SINGLE_SHOP" as const, label: "Single Shop", description: "I run one business or location." },
                          ].map((option) => (
                            <RadioGroupPrimitive.Item
                              key={option.value}
                              value={option.value}
                              data-testid={`radio-lead-type-${option.value.toLowerCase()}`}
                              className={`aspect-auto h-auto min-h-12 w-full min-w-0 rounded-xl border px-4 py-3 text-left shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                                field.value === option.value
                                  ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent"
                              }`}
                            >
                              <span className="block text-sm font-semibold">{option.label}</span>
                              <span className="mt-1 block text-xs leading-relaxed">{option.description}</span>
                            </RadioGroupPrimitive.Item>
                          ))}
                        </RadioGroup>
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
                          <Input data-testid="input-trial-name" className="text-base" placeholder="Jane Smith" {...field} />
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
                        <FormLabel>Business or shop name *</FormLabel>
                        <FormControl>
                          <Input data-testid="input-trial-shop-name" className="text-base" placeholder="The Green Room" {...field} />
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
                            data-testid="input-trial-phone"
                            className="text-base"
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
                  data-testid="button-submit-trial-request"
                  className="h-11 w-full font-semibold"
                   disabled={requestPending}
                >
                   {requestPending ? "Sending request…" : "Send guided trial request"} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                {requestError && (
                  <p role="alert" data-testid="status-trial-request-error" className="text-sm text-destructive">
                    We couldn't send your request. Your details are still here; please try again.
                  </p>
                )}
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  This requests a free guided trial, not instant access. The trial does not automatically renew or charge. Paid service starts only if you accept a written custom quote.
                </p>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
