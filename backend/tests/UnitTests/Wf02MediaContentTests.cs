using AccessMapVN.Infrastructure.Services;
using FluentAssertions;

namespace AccessMapVN.UnitTests;

public sealed class Wf02MediaContentTests
{
    [Theory]
    [InlineData("image/jpeg", "FFD8FFE000104A464946")]
    [InlineData("image/png", "89504E470D0A1A0A00000000")]
    [InlineData("image/gif", "47494638396100000000")]
    [InlineData("image/webp", "524946460000000057454250")]
    [InlineData("video/mp4", "000000186674797069736F6D")]
    [InlineData("video/webm", "1A45DFA300000000")]
    public void MatchesDeclaredContent_AcceptsKnownSignatures(string mimeType, string hex)
    {
        Wf02MediaService.MatchesDeclaredContent(mimeType, Convert.FromHexString(hex)).Should().BeTrue();
    }

    [Fact]
    public void MatchesDeclaredContent_RejectsArbitraryBytesDeclaredAsPng()
    {
        Wf02MediaService.MatchesDeclaredContent("image/png", "nope"u8.ToArray()).Should().BeFalse();
    }
}
