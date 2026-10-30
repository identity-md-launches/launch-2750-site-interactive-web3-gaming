import { useEffect, useRef, useState } from "react";
import {
  createConfig,
  http,
  useConnection,
  useConnect,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";
import { getAddress } from "viem";
import { Icon } from "./icons";

export const walletConfig = createConfig({
  chains: [sepolia],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Squeek Play",
      appLogoUrl: new URL("favicon.svg", document.baseURI).href,
    }),
  ],
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
});
const OPEN_IN = [
  {
    id: "metamask",
    name: "MetaMask",
    href: (url: string) =>
      `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (url: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    id: "rabby",
    name: "Rabby",
    href: (url: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (url: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`,
  },
];
export function Wallet() {
  const { address, isConnected, chainId } = useConnection();
  const {
    connectors,
    mutate: connect,
    isPending,
    variables,
    error,
    reset,
  } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const {
    mutate: switchChain,
    isPending: switching,
    error: switchError,
  } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !(window as unknown as { ethereum?: unknown }).ethereum &&
    !connectors.some((c) => c.type === "injected" && c.id !== "injected");
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      trigger.current?.focus({ preventScroll: true });
    }
  }, [open]);
  useEffect(() => {
    if (isConnected) setOpen(false);
  }, [isConnected]);
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const listed = [
    ...connectors.filter((c) => c.type === "injected"),
    ...connectors.filter((c) => c.type !== "injected"),
  ].filter(
    (c) =>
      !(named && c.id === "injected") && !(mobile && c.type === "injected"),
  );
  const label = (c: Connector) =>
    c.id === "injected"
      ? "Browser wallet"
      : c.id === "coinbaseWalletSDK" && mobile
        ? "Coinbase Smart Wallet"
        : c.name;
  const mark = (id: string, icon?: string) =>
    icon ? (
      <img src={icon} alt="" width="28" height="28" />
    ) : id === "injected" ? (
      <Icon name="wallet" size={28} />
    ) : (
      <img
        src={`${import.meta.env.BASE_URL}wallets/${id === "coinbaseWalletSDK" ? "coinbase" : id}.svg`}
        alt=""
        width="28"
        height="28"
      />
    );
  const fullAddress = address ? getAddress(address) : "";
  return (
    <>
      <button
        ref={trigger}
        className="button wallet-trigger"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Icon name="wallet" size={18} />
        <span>
          {isConnected
            ? chainId !== sepolia.id
              ? "Switch to Sepolia"
              : `${fullAddress.slice(0, 6)}…${fullAddress.slice(-4)}`
            : "Connect wallet"}
        </span>
      </button>
      <dialog
        className="wallet-dialog"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        aria-labelledby="wallet-title"
        onClose={() => {
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }}
      >
        <div className="dialog-inner">
          <div className="section-heading">
            <h2 id="wallet-title">
              {isConnected ? "Your wallet" : "Connect a wallet"}
            </h2>
            <button
              className="icon-button"
              aria-label="Close wallet dialog"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <p className="muted">
            {isConnected
              ? "Connected to Squeek Play."
              : "Choose a wallet. Racing and simulations are free to use."}
          </p>
          {isConnected ? (
            <>
              <p className="wallet-address numeric">{fullAddress}</p>
              {chainId !== sepolia.id && (
                <button
                  className="button primary full"
                  disabled={switching}
                  onClick={() => switchChain({ chainId: sepolia.id })}
                >
                  {switching ? "Switching…" : "Switch to Sepolia"}
                </button>
              )}
              {switchError && (
                <p className="inline-error" role="status">
                  Network switch declined. Try again in your wallet.
                </p>
              )}
              <button
                className="button full"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <div className="wallet-options">
              {mobile &&
                OPEN_IN.map((w) => (
                  <a
                    className="wallet-row"
                    key={w.id}
                    href={w.href(location.href)}
                  >
                    {mark(w.id)}
                    <span>Open in {w.name}</span>
                    <Icon name="external" size={16} />
                  </a>
                ))}
              {listed.map((c) => (
                <button
                  className="wallet-row"
                  key={c.uid}
                  disabled={isPending}
                  onClick={() => connect({ connector: c })}
                >
                  {mark(c.id, c.icon)}
                  <span>
                    {label(c)}
                    {isPending && variables?.connector === c
                      ? " · opening…"
                      : ""}
                  </span>
                  <Icon name="arrow" size={16} />
                </button>
              ))}
              {error && (
                <p role="status" className="inline-error">
                  {error.message.toLowerCase().includes("provider")
                    ? "No browser wallet found. Install an extension or choose Coinbase Wallet."
                    : "Connection was not completed. Choose a wallet to try again."}
                </p>
              )}
            </div>
          )}
          <p className="small muted wallet-footnote">
            <Icon name="info" size={15} />
            Sepolia testnet. This companion never requests a signature or a
            transaction.
          </p>
        </div>
      </dialog>
    </>
  );
}
