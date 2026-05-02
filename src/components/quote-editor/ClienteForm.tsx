"use client";

import type { FocusEvent } from "react";
import { CrmCustomerSearch, type CrmCustomer } from "@/components/CrmCustomerSearch";

export type ClienteFormProps = {
  clientName: string;
  setClientName: (v: string) => void;
  clientCompany: string;
  setClientCompany: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
  clientNotes: string;
  setClientNotes: (v: string) => void;
  clientAddress: string;
  setClientAddress: (v: string) => void;
  clientPostalCode: string;
  setClientPostalCode: (v: string) => void;
  clientCity: string;
  setClientCity: (v: string) => void;
  clientProvince: string;
  setClientProvince: (v: string) => void;
  clientVat: string;
  setClientVat: (v: string) => void;
  clientSdi: string;
  setClientSdi: (v: string) => void;
  crmCustomerId: string | null;
  setCrmCustomerId: (v: string | null) => void;
  onCrmSelect: (c: CrmCustomer) => void;
  onClearCrm: () => void;
  onPostalCodeBlur?: (e: FocusEvent<HTMLInputElement>) => void;
};

/**
 * Sezione "Cliente" del QuoteEditor: anagrafica, contatti, indirizzo, dati
 * fiscali, ricerca CRM. Estratto dal QuoteEditor monolitico per ridurre la
 * complessita' del file principale; tutto lo state vive ancora nel parent
 * e arriva qui come props.
 */
export function ClienteForm(props: ClienteFormProps) {
  const {
    clientName,
    setClientName,
    clientCompany,
    setClientCompany,
    clientEmail,
    setClientEmail,
    clientPhone,
    setClientPhone,
    clientNotes,
    setClientNotes,
    clientAddress,
    setClientAddress,
    clientPostalCode,
    setClientPostalCode,
    clientCity,
    setClientCity,
    clientProvince,
    setClientProvince,
    clientVat,
    setClientVat,
    clientSdi,
    setClientSdi,
    crmCustomerId,
    onCrmSelect,
    onClearCrm,
    onPostalCodeBlur,
  } = props;

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-2xl mb-4">Cliente</h2>

      <div className="mb-4">
        <div className="label">Importa dal CRM (opzionale)</div>
        <CrmCustomerSearch onSelect={onCrmSelect} />

        {crmCustomerId && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="badge badge-accent">
              <span className="badge-dot" />
              CRM #{crmCustomerId}
            </span>
            <button type="button" className="btn-ghost text-xs" onClick={onClearCrm}>
              Scollega CRM
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label" htmlFor="clientName">
            Nome referente <span style={{ color: "var(--mc-accent)" }}>*</span>
          </label>
          <input
            id="clientName"
            type="text"
            className="input"
            placeholder="Mario Rossi"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="clientCompany">
            Ragione sociale
          </label>
          <input
            id="clientCompany"
            type="text"
            className="input"
            placeholder="Edilizia Rossi Srl"
            value={clientCompany}
            onChange={(e) => setClientCompany(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="clientEmail">
            Email cliente
          </label>
          <input
            id="clientEmail"
            type="email"
            className="input"
            placeholder="mario@esempio.it"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="clientPhone">
            Telefono cliente
          </label>
          <input
            id="clientPhone"
            type="tel"
            className="input"
            placeholder="+39 333 1234567"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="label" htmlFor="clientNotes">
          Note cliente
        </label>
        <textarea
          id="clientNotes"
          className="input"
          rows={3}
          placeholder="Contesto, esigenze emerse in call..."
          value={clientNotes}
          onChange={(e) => setClientNotes(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="label" htmlFor="clientAddress">
          Indirizzo
        </label>
        <input
          id="clientAddress"
          type="text"
          className="input"
          placeholder="Via e numero civico"
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="label" htmlFor="clientPostalCode">
            CAP
          </label>
          <input
            id="clientPostalCode"
            type="text"
            className="input"
            placeholder="00000"
            value={clientPostalCode}
            onChange={(e) => setClientPostalCode(e.target.value)}
            onBlur={onPostalCodeBlur}
            inputMode="numeric"
            maxLength={5}
          />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="label" htmlFor="clientCity">
            Città
          </label>
          <input
            id="clientCity"
            type="text"
            className="input"
            placeholder="Comune"
            value={clientCity}
            onChange={(e) => setClientCity(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="clientProvince">
            Provincia
          </label>
          <input
            id="clientProvince"
            type="text"
            className="input"
            placeholder="BG"
            value={clientProvince}
            onChange={(e) => setClientProvince(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="clientVat">
            Partita IVA
          </label>
          <input
            id="clientVat"
            type="text"
            className="input"
            placeholder="IT..."
            value={clientVat}
            onChange={(e) => setClientVat(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="clientSdi">
            Codice SDI
          </label>
          <input
            id="clientSdi"
            type="text"
            className="input"
            placeholder="XXXXXXX"
            value={clientSdi}
            onChange={(e) => setClientSdi(e.target.value.toUpperCase())}
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}
