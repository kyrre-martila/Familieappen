import { Injectable } from "@nestjs/common";
import { ConfigService } from "../../config";
import { InvalidProviderResponseError, NormalizedAddress, WasteProviderConfigurationError, WasteProviderUnavailableError } from "../waste-collection.domain";

const PROXY = "https://norkartrenovasjon.azurewebsites.net/proxyserver.ashx";
const API = "https://komteksky.norkart.no/MinRenovasjon.Api/api";

@Injectable()
export class MinRenovasjonClient {
  constructor(private readonly config: ConfigService) {}

  getFractions(municipalityNumber: string): Promise<unknown> {
    return this.request(`${API}/fraksjoner/`, municipalityNumber);
  }

  getCalendar(address: NormalizedAddress): Promise<unknown> {
    const query = new URLSearchParams({ kommunenr: address.municipalityNumber, gatenavn: address.streetName,
      gatekode: address.addressCode, husnr: String(address.houseNumber) });
    return this.request(`${API}/tommekalender?${query}`, address.municipalityNumber);
  }

  private async request(server: string, municipalityNumber: string): Promise<unknown> {
    const key = this.config.minRenovasjonAppKey;
    if (!key) throw new WasteProviderConfigurationError("Waste collection provider is not configured");
    let response: Response;
    try {
      response = await fetch(`${PROXY}?${new URLSearchParams({ server })}`, {
        headers: { Kommunenr: municipalityNumber, RenovasjonAppKey: key }, signal: AbortSignal.timeout(10000)
      });
    } catch { throw new WasteProviderUnavailableError("Waste collection provider is temporarily unavailable"); }
    if (!response.ok) throw new WasteProviderUnavailableError("Waste collection provider is temporarily unavailable");
    // Norkart returns JSON with text/html, so successful bodies are parsed independent of Content-Type.
    try { return JSON.parse(await response.text()); }
    catch { throw new InvalidProviderResponseError("Waste collection provider returned an invalid response"); }
  }
}
