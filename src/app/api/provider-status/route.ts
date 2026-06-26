import { getProviderStatus } from "@/lib/providers/providerConfig";

export async function GET() {
  return Response.json({
    docsPath: "/docs/provider-setup",
    providers: getProviderStatus(),
  });
}
