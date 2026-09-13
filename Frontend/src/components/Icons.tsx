type IconProps = { size?: number, color?: string }

export const MicIcon = ({ size = 16, color = '#fff' }: IconProps) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'></path>
        <path d='M19 10v2a7 7 0 0 1-14 0v-2'></path>
        <line x1='12' y1='19' x2='12' y2='23'></line>
    </svg>
)

export const ClockOutlineIcon = ({ size = 15, color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <circle cx='12' cy='12' r='10'></circle>
        <path d='M12 6v6l4 2'></path>
    </svg>
)

export const PlusIcon = ({ size = 14, color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <line x1='12' y1='5' x2='12' y2='19'></line>
        <line x1='5' y1='12' x2='19' y2='12'></line>
    </svg>
)

export const ExpandArrowsIcon = ({ size = 14, color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <polyline points='15 3 21 3 21 9'></polyline>
        <polyline points='9 21 3 21 3 15'></polyline>
        <line x1='21' y1='3' x2='14' y2='10'></line>
        <line x1='3' y1='21' x2='10' y2='14'></line>
    </svg>
)

export const ThreeLinesIcon = ({ size = 14, color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <line x1='4' y1='6' x2='14' y2='6'></line>
        <line x1='4' y1='12' x2='18' y2='12'></line>
        <line x1='4' y1='18' x2='10' y2='18'></line>
    </svg>
)

export const DocumentIcon = ({ size = 14, color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'></path>
        <polyline points='14 2 14 8 20 8'></polyline>
    </svg>
)

export const QuestionCircleIcon = ({ size = 14, color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <circle cx='12' cy='12' r='10'></circle>
        <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'></path>
        <line x1='12' y1='17' x2='12.01' y2='17'></line>
    </svg>
)
