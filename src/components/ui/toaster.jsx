import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, open, onOpenChange, ...props }) {
        return (
          <Toast key={id} {...props} data-state={open === false ? "closed" : "open"} role={props.variant === "destructive" ? "alert" : "status"}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={() => onOpenChange ? onOpenChange(false) : dismiss(id)} />
          </Toast>
        );
      })}
    </ToastProvider>
  );
}