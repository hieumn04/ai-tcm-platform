'use client'
import { useState, useContext } from 'react'
import { TokenContext } from '@/utils/TokenProvider'
import { Link, useRouter } from '@/src/navigation'
import { usePathname } from 'next/navigation'
import {
  Navbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  Link as NextUiLink,
  ListboxItem,
  Listbox,
} from '@nextui-org/react'
import {
  ArrowRightFromLine,
  ArrowRightToLine,
  File,
  Globe,
  MoveUpRight,
  PenTool,
  CheckSquare,
} from 'lucide-react'
import DropdownAccount from './DropdownAccount'
import UserAvatar from '@/components/UserAvatar'
import { LocaleCodeType } from '@/types/locale'

type NabbarMenuMessages = {
  projects: string
  admin: string
  docs: string
  roadmap: string
  account: string
  signUp: string
  signIn: string
  signOut: string
  links: string
  languages: string
}

type Props = {
  messages: NabbarMenuMessages
  locale: LocaleCodeType
}

export default function HeaderNavbarMenu({ messages, locale }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const context = useContext(TokenContext)

  const commonLinks = [
    {
      uid: 'projects',
      href: '/projects',
      label: messages.projects,
      isExternal: false,
    },
  ]

  const router = useRouter()
  const pathname = usePathname()
  async function changeLocale(nextLocale: any) {
    let newPathname
    if (pathname.length < 4) {
      // when root path
      router.push('/', { locale: nextLocale })
    } else {
      // when not root path, trim first "/en" from pathname = "/en/projects"
      newPathname = pathname.slice(locale.length + 1)
      router.push(newPathname, { locale: nextLocale })
    }
  }

  return (
    <Navbar
      isMenuOpen={isMenuOpen}
      maxWidth="full"
      position="sticky"
      className="bg-inherit"
    >
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <Link
            className="flex justify-start items-center gap-2"
            href="/"
            locale={locale}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm ring-1 ring-white/20">
              <CheckSquare size={18} className="text-white" />
            </div>
            <p className="font-extrabold text-inherit text-lg tracking-tight">TCM</p>
          </Link>
        </NavbarBrand>
        {commonLinks.map((link) =>
          link.isExternal ? (
            <NavbarItem key={link.uid} className="hidden md:block">
              <NextUiLink
                isExternal
                href={link.href}
                showAnchorIcon
                anchorIcon={<MoveUpRight size={12} className="ms-1" />}
              >
                {link.label}
              </NextUiLink>
            </NavbarItem>
          ) : (
            <NavbarItem key={link.uid} className="hidden md:block">
              <Link
                className="data-[active=true]:text-primary data-[active=true]:font-medium"
                href={link.href}
                locale={locale}
              >
                {link.label}
              </Link>
            </NavbarItem>
          ),
        )}
        {context.isAdmin() && (
          <NavbarItem key="admin" className="hidden md:block">
            <Link
              className="data-[active=true]:text-primary data-[active=true]:font-medium"
              href="/admin"
              locale={locale}
            >
              {messages.admin}
            </Link>
          </NavbarItem>
        )}
      </NavbarContent>

      <NavbarContent className="basis-1 pl-4" justify="end">
        {/* <ThemeSwitch /> */}
        <div className="hidden md:block">
          <DropdownAccount
            messages={messages}
            locale={locale}
            onItemPress={() => {}}
          />
          {/* <DropdownLanguage locale={locale} onChangeLocale={changeLocale} /> */}
        </div>
        <NavbarMenuToggle
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          <p className="font-bold">{messages.links}</p>
          <Listbox
            aria-label="Links"
            itemClasses={{
              base: 'h-10 text-large',
            }}
          >
            {commonLinks.map((link) =>
              link.isExternal ? (
                <ListboxItem
                  key={link.uid}
                  title={link.label}
                  startContent={<MoveUpRight size={12} />}
                  onClick={() => {
                    window.open(link.href, '_blank')
                    setIsMenuOpen(false)
                  }}
                />
              ) : (
                <ListboxItem
                  key={link.uid}
                  title={link.label}
                  startContent={<File size={12} />}
                  onClick={() => {
                    router.push(link.href, { locale: locale })
                    setIsMenuOpen(false)
                  }}
                />
              ),
            )}
          </Listbox>

          <p className="font-bold">{messages.account}</p>
          {context.isSignedIn() ? (
            <Listbox
              aria-label="Account links"
              itemClasses={{
                base: 'h-10 text-large',
              }}
            >
              <ListboxItem
                key="account"
                title={messages.account}
                startContent={<UserAvatar context={context} />}
                onClick={() => {
                  router.push('/account', { locale: locale })
                  setIsMenuOpen(false)
                }}
              />
              <ListboxItem
                key="signout"
                title={messages.signOut}
                startContent={<ArrowRightFromLine size={16} />}
                onClick={() => {
                  context.setToken({
                    access_token: '',
                    expires_at: 0,
                    user: null,
                  })
                  context.removeTokenFromLocalStorage()
                  router.push(`/account/signin`, { locale: locale })
                  setIsMenuOpen(false)
                }}
              />
            </Listbox>
          ) : (
            <Listbox
              aria-label="Account links"
              itemClasses={{
                base: 'h-10 text-large',
              }}
            >
              <ListboxItem
                key="signin"
                startContent={<ArrowRightToLine size={16} />}
                title={messages.signIn}
                onClick={() => {
                  router.push('/account/signin', { locale: locale })
                  setIsMenuOpen(false)
                }}
              />
              <ListboxItem
                key="signup"
                title={messages.signUp}
                startContent={<PenTool size={16} />}
                onClick={() => {
                  router.push('/account/signup', { locale: locale })
                  setIsMenuOpen(false)
                }}
              />
            </Listbox>
          )}
          {/* <p className="font-bold">{messages.languages}</p>
          <Listbox
            aria-label="Language links"
            itemClasses={{
              base: 'h-10 text-large',
            }}
          >
            {locales.map((entry) => (
              <ListboxItem
                key={entry.code}
                startContent={<Globe size={16} />}
                title={entry.name}
                onClick={() => {
                  changeLocale(entry.code);
                  setIsMenuOpen(false);
                }}
              />
            ))}
          </Listbox> */}
        </div>
      </NavbarMenu>
    </Navbar>
  )
}
