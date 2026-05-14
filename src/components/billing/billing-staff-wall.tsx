import { AlertTriangle } from "lucide-react";

export function BillingStaffWall({ reason }: { reason: "needs_setup" | "locked" }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-neutral-900">
          {reason === "needs_setup" ? "Cuenta pendiente de activación" : "Acceso temporalmente suspendido"}
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          {reason === "needs_setup"
            ? "El propietario del estudio aún no ha activado la suscripción a la plataforma. Comunícate con él para que complete el proceso."
            : "El estudio tiene un problema con su suscripción. El propietario necesita actualizar su método de pago para restablecer el acceso."}
        </p>
      </div>
    </div>
  );
}
