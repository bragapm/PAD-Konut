export default defineAppConfig({
  ui: {
    colors: {
      primary: "brand",
      gray: "grey",
      brand: "brand",
    },
    button: {
      slots: { base: "cursor-pointer rounded-sm" },
      variants: {
        size: {
          icon: {
            base: "px-1 py-1 text-2xs gap-1",
            leadingIcon: "size-3",
            leadingAvatarSize: "3xs",
            trailingIcon: "size-3",
          },
          "2xs": {
            base: "px-2 py-1 text-2xs gap-1",
            leadingIcon: "size-3",
            leadingAvatarSize: "3xs",
            trailingIcon: "size-3",
          },
        },
      },
      compoundVariants: [
        {
          color: "gray",
          variant: "solid",
          class:
            "text-white bg-grey-600 hover:bg-grey-600/90 active:bg-grey-600/90 disabled:bg-grey-600 aria-disabled:bg-grey-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grey-600",
        },
        {
          color: "gray",
          variant: "outline",
          class:
            "text-grey-200 hover:bg-grey-600/10 ring-grey-600 active:bg-grey-600/90 disabled:text-grey-500 aria-disabled:text-grey-500 disabled:bg-transparent aria-disabled:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grey-600",
        },
        {
          color: "gray",
          variant: "subtle",
          class:
            "text-grey-200 bg-grey-800 hover:bg-grey-800/90 active:bg-grey-800/90 disabled:bg-grey-800 aria-disabled:bg-grey-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grey-800",
        },
        {
          color: "gray",
          variant: "ghost",
          class:
            "text-grey-400 hover:bg-grey-800 active:bg-grey-800 disabled:bg-grey-600 aria-disabled:bg-grey-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grey-600",
        },
        {
          color: "brand",
          variant: "soft",
          class: "bg-brand-950",
        },
      ],
      defaultVariants: {
        color: "primary",
        variant: "solid",
        size: "md",
      },
    },
    calendar: {
      slots: {
        header: "text-grey-50 text-xs",
        cellTrigger: [
          "text-grey-50 rounded-lg",
        ],
      },
      variants: {
        color: {
          primary: {
            headCell: "text-grey-50",
            cellTrigger:
              "focus-visible:ring-primary data-[selected]:bg-brand-950 data-[selected]:text-brand-500 data-today:not-data-[selected]:text-muted data-[highlighted]:bg-primary/20 hover:not-data-[selected]:bg-brand-950",
          },
        },
      },
    },
    dropdownMenu: {
      slots: {
        content: "w-full rounded-sm bg-grey-800 ring-1 ring-grey-600",
        item: "text-grey-200 before:rounded-sm cursor-pointer hover:text-grey-700 px-1.5 py-1 rounded-sm hover:bg-grey-200 text-xs",
      },
      variants: {
        active: { true: "text-grey-200", false: "text-grey-200" },
      },
      defaultVariants: {
        size: "sm",
      },
    },
    input: {
      slots: {
        base: "rounded-sm",
        trailingIcon: "text-grey-500",
      },
      variants: {
        variant: {
          outline: "ring-grey-600 bg-transparent",
          subtle: "ring-grey-600 bg-grey-700",
        },
        size: {
          xs: {
            base: "text-2xs",
          },
        },
      },
      compoundVariants: [
        {
          color: "gray",
          variant: "outline",
          class: "bg-grey-700 ring-grey-600 text-grey-200 focus:ring-grey-600",
        },
      ],
      defaultVariants: {
        size: "sm",
        color: "primary",
        variant: "outline",
      },
    },
    textarea: {
      variants: {
        variant: {
          outline: "ring-grey-600 bg-grey-700",
        },
        size: {
          "2xs": {
            base: "px-2 py-1 text-2xs gap-1",
            leading: "ps-2 inset-y-1",
            trailing: "pe-2 inset-y-1",
            leadingIcon: "size-4",
            leadingAvatarSize: "3xs",
            trailingIcon: "size-4",
          },
        },
      },
    },
    toast: {
      slots: {
        root: "bg-grey-900 ring-grey-700",
        description: "text-grey-500",
        close: "text-grey-200",
      },
    },
    inputMenu: {
      slots: {
        content: "w-full rounded-sm bg-grey-800 ring-1 ring-grey-600",
        item: "text-grey-200 before:rounded-sm cursor-pointer hover:text-grey-700 px-1.5 py-1 rounded-sm hover:bg-grey-600 text-xs",
      },
      variants: { variant: { subtle: "ring-grey-600 bg-grey-700" } },
    },
    modal: {
      slots: {
        content: "bg-grey-900 divide-grey-700",
        title: "text-xs text-grey-50",
        description: "text-2xs text-grey-400",
        close: "text-grey-400",
      },
      variants: { fullscreen: { false: { content: "ring-grey-800" } } },
    },
    radioGroup: {
      compoundVariants: [
        {
          color: "primary",
          variant: "card",
          class: {
            base: "ring-red-500",
            item: "has-data-[state=checked]:bg-brand-950",
          },
        },
      ],
      variants: {
        variant: {
          card: {
            item: "border-none rounded-sm",
          },
        },
      },
    },
    slider: {
      slots: { track: "bg-grey-700", thumb: "bg-grey-400 ring-0" },
      variants: {
        color: {
          gray: {
            range: "bg-grey-400",
          },
        },
        size: {
          xs: {
            thumb: "size-2",
          },
        },
      },
      compoundVariants: [
        {
          orientation: "horizontal",
          size: "xs",
          class: {
            track: "h-[4px]",
          },
        },
      ],
    },
    select: {
      slots: {
        base: "rounded-sm",
        content: "rounded-sm bg-grey-700 ring-1 ring-grey-600",
        item: [
          "text-xs text-grey-200 before:rounded-sm cursor-pointer hover:text-grey-700 px-1.5 py-1 bg-transparent data-highlighted:not-data-disabled:text-grey-50 data-highlighted:not-data-disabled:before:bg-brand-950",
        ],
      },
      variants: {
        variant: {
          subtle: "ring-grey-600",
          outline: "bg-transparent ring-grey-600",
        },
      },
    },
    selectMenu: {
      slots: {
        base: ["w-full rounded-sm"],
        content: ["max-h-40 rounded-sm bg-grey-900 ring-1 ring-grey-600"],
        item: [
          "text-xs text-grey-200 before:rounded-sm cursor-pointer hover:text-grey-700 px-1.5 py-1 bg-transparent data-highlighted:not-data-disabled:text-grey-700 data-highlighted:not-data-disabled:before:bg-grey-200",
        ],
      },
      variants: { variant: { outline: "bg-grey-700 ring-grey-600" } },
    },
    skeleton: {
      base: "rounded-sm bg-grey-800",
    },
    stepper: {
      variants: {
        color: {
          primary: {
            trigger:
              "group-data-[state=completed]:bg-transparent group-data-[state=active]:bg-transparent focus-visible:outline-primary",
          },
        },
        size: {
          md: {
            trigger: "size-2 text-base",
            title: "text-sm",
          },
        },
      },
    },
    // pagination: {
    //   inactiveButton: {
    //     color: {
    //       custom: "bg-red-500 dark:bg-red-500 text-blue-500 dark:text-blue-500",
    //     },
    //   },
    // },
    // button: {
    //   variant: {
    //     outline:
    //       "bg-{color}-950 ring-1 ring-{color}-500 ring-inset text-{color}-500 hover:ring-{color}-700  disabled:text-grey-600 disabled:ring-grey-600 disabled:hover:bg-transparent hover:bg-{color}-950 focus-visible:ring-1 focus-visible:ring-brand-200",
    //     paginationActive:
    //       "bg-brand-950 border border-brand-950 text-brand-500 text-2xs rounded-sm w-6 h-6 justify-center",
    //     paginationInactive:
    //       "bg-grey-700 border-grey-600 text-grey-200 text-2xs rounded-sm w-6 h-6 justify-center",
    //   },
    //   color: {
    //     navMenu: {
    //       solid:
    //         "shadow-sm text-white dark:text-grey-900 bg-white/10 hover:bg-white/20 disabled:bg-white/10 dark:bg-white dark:hover:bg-grey-100 dark:disabled:bg-white focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400",
    //     },
    //     navActive: {
    //       solid:
    //         "shadow-sm ring-1 ring-inset ring-grey-300 dark:ring-grey-700 text-brand-500 dark:text-white bg-white hover:bg-white/90 disabled:bg-white dark:bg-grey-900 dark:hover:bg-grey-800/50 dark:disabled:bg-grey-900 focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400",
    //     },
    //   },
    // },
    // input: {
    //   color: {
    //     gray: {
    //       outline:
    //         "shadow-sm bg-grey-700 dark:bg-grey-700 text-grey-200 dark:text-white ring-1 ring-inset ring-grey-600 dark:ring-grey-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400",
    //     },
    //   },
    // },
    // select: {
    //   color: {
    //     gray: {
    //       outline:
    //         "shadow-sm bg-grey-700 dark:bg-grey-700 text-grey-200 dark:text-white ring-1 ring-inset ring-grey-600 dark:ring-grey-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400",
    //     },
    //   },
    // },
    // notifications: {
    //   position: "bottom-0 top-auto",
    // },
    // notification: {
    //   background: "bg-grey-900",
    //   rounded: "rounded-lg",
    //   title: "text-sm font-medium text-grey-50",
    //   description: "text-sm font-normal text-grey-400",
    //   ring: "ring-1 ring-grey-800",
    //   padding: "p-4",
    //   icon: {
    //     color: "text-brand-500",
    //   },
    // },
  },
});
