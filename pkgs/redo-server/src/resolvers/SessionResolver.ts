import { Ctx, Mutation, Resolver, Args } from "type-graphql"
import { hash, compare } from "bcrypt"
import { sign } from "jsonwebtoken"
import { Session, SignInInput, SignUpInput } from "redo-model"
import { APP_SECRET } from "../utils"
import { Context } from "../context"
import Photon from "@generated/photon"

const userWithEmail = async (email: string, photon: Photon) => {
    // TODO: Find an idiomatic way to check if a unique field exists in photon
    try {
        return await photon.users.findOne({ where: { email } })
    } catch {
        return null
    }
}

@Resolver(of => Session)
export class SessionResolver {
    @Mutation(returns => Session)
    async signUp(
        @Args() { email, password, firstName, lastName }: SignUpInput,
        @Ctx() { photon }: Context
    ) {
        const hashedPassword = await hash(password, 10)
        if (await userWithEmail(email, photon)) {
            throw new Error(
                "Someone's already using that email. If it's you, try signing in instead!"
            )
        }
        const user = await photon.users.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                roles: { set: ["user"] }
            }
        })
        return {
            token: sign({ userId: user.id }, APP_SECRET),
            user
        }
    }

    @Mutation(returns => Session)
    async signIn(
        @Args() { email, password }: SignInInput,
        @Ctx() { photon }: Context
    ) {
        const user = await userWithEmail(email, photon)
        if (!user) {
            throw new Error("We don't recognize that email.")
        }
        const passwordValid = await compare(password, user.password)
        if (!passwordValid) {
            throw new Error("That wasn't the right password.")
        }
        return {
            token: sign({ userId: user.id }, APP_SECRET),
            user
        }
    }
}
