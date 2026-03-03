import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Wallet } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
            <Link href="/" className="absolute top-8 left-8 text-sm text-muted-foreground hover:text-foreground transition-colors">
                &larr; Back to Home
            </Link>

            <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 shadow-2xl">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold">Human Login</CardTitle>
                    <CardDescription>Authorize your agents and pre-fund your crypto account.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 mt-4">
                    <div className="space-y-4">
                        <Button className="w-full h-12 text-md font-medium bg-blue-600 hover:bg-blue-700" asChild>
                            <Link href="/dashboard">
                                <Wallet className="mr-2 h-5 w-5" />
                                Connect Web3 Wallet (Base)
                            </Link>
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-zinc-900 px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>

                        <Button variant="outline" className="w-full h-12 text-md font-medium border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800" asChild>
                            <Link href="/dashboard">
                                <User className="mr-2 h-5 w-5 text-zinc-400" />
                                Continue with Email
                            </Link>
                        </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground mt-6">
                        By connecting your wallet, you agree to the Z-ZERO Terms of Service and Privacy Policy.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
