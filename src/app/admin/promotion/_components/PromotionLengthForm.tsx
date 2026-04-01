import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; // Assuming you use Yup for validation
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/FormInput";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

interface Props {
  handleLengthSubmit: (data: Values) => void;
  promotionLengthData: Values;
  loading: boolean;
}

const promotionLengthSchema = z.object({
  numberOfReferralsBeforePromo: z.string().trim().max(2, "Too Long!"),
  numberOfFreePromo: z.string().trim().max(2, "Too Long!"),
});

type Values = z.infer<typeof promotionLengthSchema>;

export default function PromotionLengthForm({
  handleLengthSubmit,
  promotionLengthData,
  loading,
}: Props) {
  const form = useForm<Values>({
    defaultValues: promotionLengthData,
    resolver: zodResolver(promotionLengthSchema),
  });

  useEffect(() => {
    form.reset(promotionLengthData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotionLengthData]);

  const onSubmit: SubmitHandler<Values> = (data) => {
    return handleLengthSubmit(data);
  };

  const {
    // handleSubmit,
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="relative">
          <div className="grid gap-4">
            <div className="mb-4">
              <FormField
                control={form.control}
                name="numberOfReferralsBeforePromo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FormInput
                        spellCheck={true}
                        required
                        placeholder="Length Of Promotion"
                        label="Length Of Promotion"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mb-4">
              <FormField
                control={form.control}
                name="numberOfFreePromo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FormInput
                        spellCheck={true}
                        required
                        placeholder="Number Of Free Promotions"
                        label="Number Of Free Promotions"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center mt-6">
          <Button
            className="w-full"
            size="sm"
            type="submit"
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? "Creating..." : "Create Promotion"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
