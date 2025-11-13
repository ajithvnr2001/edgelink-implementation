import { redirect } from 'next/navigation'

// Redirect old signup page to new Clerk sign-up page
export default function SignupPage() {
  redirect('/sign-up')
}
