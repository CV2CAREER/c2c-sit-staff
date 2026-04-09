import { VisuallyHidden as VisuallyHiddenPrimitive } from "@radix-ui/react-visually-hidden"

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => {
    return (
      <VisuallyHiddenPrimitive>
        <span>{children}</span>
      </VisuallyHiddenPrimitive>
    );
}

export default VisuallyHidden